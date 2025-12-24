from app.main import celery_app
from common.core.htag_node import HTagNode
import time
import os
import requests
from bs4 import BeautifulSoup
from neo4j import GraphDatabase
from urllib.parse import urljoin, urlparse
from collections import deque
import logging

# Neo4j configuration
NEO4J_URI = os.getenv("NEO4J_URI", "bolt://neo4j:7687")
NEO4J_USER = os.getenv("NEO4J_USER", "neo4j")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD", "password")

driver = None

def get_db_driver():
    global driver
    if driver is None:
        try:
            driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))
            driver.verify_connectivity()
            logging.info("Connected to Neo4j")
        except Exception as e:
            logging.error(f"Failed to connect to Neo4j: {e}")
            raise e
    return driver

def fetch_page(url):
    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        return response
    except requests.exceptions.RequestException as e:
        logging.warning(f"Failed to fetch {url}: {e}")
        return None

def create_htag_node(soup, url, title):
    # Create the root node for the page
    # According to prompt, we use HTagNode to parse structure.
    # Here we treat the page as a root node.
    # Level 0 for the page itself relative to its content.

    # Clean title
    title = title.strip() if title else url

    node = HTagNode(title=title, level=0)

    # Extract text content
    # We'll just grab all paragraph text for now as "items"
    # Filtering out very short snippets
    for p in soup.find_all('p'):
        text = p.get_text(strip=True)
        if len(text) > 20: # arbitrary filter for noise
            node.add_item(text)

    return node

def extract_links(soup, base_url):
    links = set()
    base_domain = urlparse(base_url).netloc

    for a_tag in soup.find_all('a', href=True):
        if len(links) >= 100:
            print(f"Reached limit of 100 links for {base_url}")
            break
        href = a_tag['href']
        full_url = urljoin(base_url, href)
        parsed_url = urlparse(full_url)

        # Filter for same domain and avoid fragments/queries if desired,
        # but for now we keep queries, strip fragments.
        if parsed_url.netloc == base_domain:
            # Remove fragment
            clean_url = full_url.split('#')[0]
            if clean_url != base_url: # Don't link to self in this context if not needed
                links.add(clean_url)

    return links

@celery_app.task
def scan_site(url, max_depth=2):
    print(f"Scanning site: {url} with max_depth: {max_depth}")
    logging.info(f"START SCAN: {url} max_depth={max_depth}")

    driver = get_db_driver()

    queue = deque([(url, 0)])
    visited = set()
    scanned_count = 0

    while queue:
        current_url, current_depth = queue.popleft()

        if current_url in visited:
            continue

        visited.add(current_url)

        if current_depth > max_depth:
            continue

        print(f"Fetching: {current_url} (Depth: {current_depth})")
        logging.info(f"FETCHING: {current_url} at depth {current_depth}")
        response = fetch_page(current_url)

        if not response:
            # Handle error state in DB
            with driver.session() as session:
                session.run("""
                    MERGE (p:Page {url: $url})
                    SET p.last_scanned_at = timestamp(),
                        p.error = true
                """, url=current_url)
            continue

        try:
            # Log detected encoding for debugging (Mojibake fix)
            logging.info(f"Detected encoding for {current_url}: {response.apparent_encoding} (Response encoding: {response.encoding})")
            
            # Use raw bytes (response.content) so BeautifulSoup can detect encoding from meta tags
            soup = BeautifulSoup(response.content, 'html.parser')
            title = soup.title.string if soup.title else ""

            # Create HTagNode and get content
            htag_node = create_htag_node(soup, current_url, title)
            content_list = htag_node.get_content()
            content_text = "\n".join(content_list)

            # Extract and process links
            links = extract_links(soup, current_url)

            with driver.session() as session:
                # Upsert Node
                session.run("""
                    MERGE (p:Page {url: $url})
                    SET p.title = $title,
                        p.level = $level,
                        p.content = $content,
                        p.last_scanned_at = timestamp(),
                        p.error = false
                """, url=current_url, title=title, level=current_depth, content=content_text)

                for link in links:
                    # Create Link relationship
                    # We merge the target node as a placeholder if it doesn't exist
                    session.run("""
                        MERGE (source:Page {url: $source_url})
                        MERGE (target:Page {url: $target_url})
                        MERGE (source)-[:LINKS_TO]->(target)
                    """, source_url=current_url, target_url=link)

                    if link not in visited and current_depth + 1 <= max_depth:
                        queue.append((link, current_depth + 1))

            scanned_count += 1

        except Exception as e:
            logging.error(f"Error processing {current_url}: {e}")
            with driver.session() as session:
                session.run("""
                    MERGE (p:Page {url: $url})
                    SET p.last_scanned_at = timestamp(),
                        p.error = true,
                        p.error_message = $msg
                """, url=current_url, msg=str(e))

    return {"status": "completed", "url": url, "nodes_scanned": scanned_count}
