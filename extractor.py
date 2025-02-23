import requests
import json
import time
from urllib.parse import quote

# Update these headers with valid cookie and token values.
# Define necessary cookies
# Define headers
headers = {
    'accept': 'application/vnd.linkedin.normalized+json+2.1',
    'csrf-token': 'ajax:8680166990053153866',
    'x-restli-protocol-version': '2.0.0',
    'JSESSIONID': '"ajax:8680166990053153866"'
}

def sleep(ms):
    time.sleep(ms / 1000.0)

def get_likes(post_id, start=0, count=100):
    # URL-encode the post_id for safe URL construction.
    encoded_post_id = quote(post_id, safe='')
    profiles_response = []
    url = (
        f"https://www.linkedin.com/voyager/api/graphql?includeWebMetadata=true&"
        f"variables=(count:{count},start:{start},threadUrn:{encoded_post_id})&"
        "queryId=voyagerSocialDashReactions.cab051ffdf47c41130cdd414e0097402"
    )
    print("Requesting likes from:", url)
    try:
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        if not response.text.strip():
            print("Empty response received from likes endpoint.")
            return [], 0

        parsed_data = json.loads(response.text)
        data = parsed_data.get("data", {}).get("data", {}).get("socialDashReactionsByReactionType", {})
        total = data.get("paging", {}).get("total", 0)
        if "*elements" in data:
            profiles = data["*elements"]
            included = parsed_data.get("included", [])
            for item in included:
                reactor_lockup = item.get('reactorLockup')
                if not reactor_lockup:
                    continue
                full_name = reactor_lockup.get('title', {}).get('text', '')
                subtitle_obj = reactor_lockup.get('subtitle') or {}
                title = subtitle_obj.get('text', '')
                profile_url = reactor_lockup.get('navigationUrl', '')
                image_url = None

                image = reactor_lockup.get("image", {})
                attributes = image.get("attributes", [{}])
                if attributes and isinstance(attributes[0], dict):
                    detail_data = attributes[0].get("detailData", {})
                    non_entity_picture = detail_data.get("nonEntityProfilePicture", {})
                    if non_entity_picture:
                        vector_images = non_entity_picture.get("vectorImage", {})
                        if vector_images:
                            for artifact in vector_images.get("artifacts", []):
                                image_url = vector_images.get("rootUrl", "") + artifact.get("fileIdentifyingUrlPathSegment", "")
                profiles_response.append({
                    "full_name": full_name,
                    "title": title,
                    "profile_url": profile_url,
                    "image_url": image_url
                })
        print(f"Received {len(profiles_response)} like entries; total likes reported: {total}")
        return profiles_response, total
    except requests.RequestException as e:
        print(f"Request error for post ID {post_id}: {e}")
        return [], 0
    except json.JSONDecodeError as e:
        print(f"JSON decode error for post ID {post_id}: {e}")
        return [], 0

def get_all_likes(post_id):
    profiles = []
    start_value = 0
    while True:
        temp, total = get_likes(post_id, start=start_value * 100, count=100)
        if start_value == 0 and not temp:
            print("No likes data received for the first call. Exiting.")
            break
        profiles.extend(temp)
        print("Total likes:", total, "Collected profiles:", len(profiles))
        start_value += 1
        if start_value * 100 >= total:
            break
    return profiles

def fetchProfileId(profile_public_id):
    endpoint = f"https://www.linkedin.com/voyager/api/identity/profiles/{profile_public_id}/profileView"
    try:
        response = requests.get(endpoint, headers=headers)
        response.raise_for_status()
        parsed_data = json.loads(response.text)
        profile_urn = parsed_data.get("data", {}).get("*profile", "")
        if not profile_urn:
            print("Profile URN not found in response.")
            return None, None
        profile_id = profile_urn.replace("urn:li:fs_profile:", "")
        print("Fetched profile URN:", profile_urn)
        return profile_id, parsed_data.get("data", {})
    except requests.RequestException as e:
        print(f"Request error fetching profile ID for {profile_public_id}: {e}")
        return None, None
    except json.JSONDecodeError as e:
        print(f"JSON decode error fetching profile ID for {profile_public_id}: {e}")
        return None, None

def fetch_profile_updates(profile_public_id, max_posts=100):
    private_id, data = fetchProfileId(profile_public_id)
    if not private_id:
        print("Failed to fetch profile ID.")
        return {}
    print("Fetched profile private ID:", private_id)
    endpoint = (
        f"https://www.linkedin.com/voyager/api/graphql?includeWebMetadata=true&"
        f"variables=(count:{max_posts},start:0,profileUrn:urn%3Ali%3Afsd_profile%3A{private_id})&"
        "queryId=voyagerFeedDashProfileUpdates.3674dc8bb556ad5b86f366309bb96671"
    )
    print("Fetching profile updates from endpoint:", endpoint)
    try:
        response = requests.get(endpoint, headers=headers)
        response.raise_for_status()
        parsed_data = json.loads(response.text)
        feeds = parsed_data.get("data", {}).get("data", {}).get("feedDashProfileUpdatesByMemberShareFeed", {}).get("*elements", [])
        feed_ids = []
        feed_data = {}
        included = parsed_data.get("included", [])
        # First pass: extract feed URL and IDs
        for item in included:
            if "entityUrn" in item and item["entityUrn"] in feeds:
                share_url = item.get("socialContent", {}).get("shareUrl", "")
                social_detail = item.get("*socialDetail", "")
                if social_detail:
                    feed_urn = social_detail.replace("urn:li:fsd_socialDetail:(", "").split(',')[0]
                    feed_ids.append(feed_urn)
                    feed_data[feed_urn] = {
                        "Feed Url": share_url,
                        "Feed Id": feed_urn
                    }
        # Second pass: update feed details
        for item in included:
            if "urn" in item and item["urn"] in feed_ids:
                feed_urn = item["urn"]
                feed_data[feed_urn]["_id"] = feed_urn
                feed_data[feed_urn]["numComments"] = item.get("numComments", 0)
                feed_data[feed_urn]["numLikes"] = item.get("numLikes", 0)
                feed_data[feed_urn]["numShares"] = item.get("numShares", 0)
                feed_data[feed_urn]["profilePublicId"] = profile_public_id
                feed_data[feed_urn]["repost"] = (profile_public_id not in feed_data[feed_urn]["Feed Url"])
        return feed_data
    except requests.RequestException as e:
        print(f"Request error fetching profile updates: {e}")
        return {}
    except json.JSONDecodeError as e:
        print(f"JSON decode error fetching profile updates: {e}")
        return {}
    except KeyError as e:
        print(f"Key error while processing profile updates: {e}")
        return {}

if __name__ == "__main__":
    # Set a valid LinkedIn public identifier here.
    liId = "mindofkira"
    posts = fetch_profile_updates(liId, max_posts=10)
    print("Fetched profile updates:")
    print(json.dumps(posts, indent=4))
    
    for post in posts:
        if posts[post].get("repost") == False:
            print(f"\nProcessing post: {post}")
            print("Post data:", json.dumps(posts[post], indent=4))
            print("Feed Id:", posts[post]["Feed Id"])
            print("Feed URL:", posts[post]["Feed Url"])
            
            post_reactors = get_all_likes(posts[post]["Feed Id"])
            print("Post Reactors:")
            for reactor in post_reactors:
                reactor["post_id"] = posts[post]["Feed Id"]
                reactor["post_url"] = posts[post]["Feed Url"]
                reactor["li_id"] = liId
                print(json.dumps(reactor, indent=4))
