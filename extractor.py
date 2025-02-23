import requests
import json
import time
from urllib.parse import quote

headers = {
    'accept': 'application/vnd.linkedin.normalized+json+2.1',
    'accept-language': 'en-GB,en-US;q=0.9,en;q=0.8',
    'cookie': 'li_sugr=69eeaf66-5db2-4047-8720-a68251c36805; bcookie="v=2&75c2220c-5367-46ea-84f7-9b5dc3fca9c0"; bscookie="v=1&20241111101659fb31701f-2776-4ae1-880d-16c638402159AQE7A9HJ_VGgXHe8p2Ih73i9vSgvNS4Y"; li_rm=AQFEK2CW1AlqsQAAAZTHLRy4FfknBCazNeh1OpXbsR9ooev0uGnwaDw8TUbN1-vRsHCTbc8xFy6iXakC8hd053GqG4u1cHNLOTUUuvw7hDrMXZkJsFazci3h; liap=true; JSESSIONID="ajax:3421727281296924722"; li_theme=light; li_theme_set=app; _guid=430dd755-f851-4a8d-af23-0940d06d0bf2; dfpfpt=f414abf743e341a98e2f0f0f423921f9; li_at=AQEDAUMFv2YAnCo6AAABlMctMlUAAAGVPTI77VYApv4rZlynCwrfOj6gYK6EwcI6jEFyK99TpFtxQB1Sl7g3Rs4fPJUxBh95A697ehHl-5v-e0a00M8XyF5m8jhccCSwxyfYOgOpsYLcMyTs5LJv2KVb; timezone=Asia/Calcutta; AnalyticsSyncHistory=AQKFqYmta5SYUQAAAZUomZOXju4U9Mr0PYAWrBtIMOs_ii6VbZEIjU09rneOBzvax2bY5bU6rDslR_YVqC4BKA; lms_ads=AQF65EEdHe1spwAAAZUomZc3k2kEuu6IAN9O9cxc9rjtz6-r2K0toRjAG5uBcHMoAHG-CJGvZEvBZBt4C9bR-kfoZIUMvcG-; lms_analytics=AQF65EEdHe1spwAAAZUomZc3k2kEuu6IAN9O9cxc9rjtz6-r2K0toRjAG5uBcHMoAHG-CJGvZEvBZBt4C9bR-kfoZIUMvcG-; lang=v=2&lang=en-us; fptctx2=taBcrIH61PuCVH7eNCyH0Iitb%252bEMfwlgK%252fM8w%252f28EbffFidXCc9ni9E5IOTk3feLlxchpPT8zikR7i8wgRqXM0HYmSb0ZkpVHaJdeFaowxr2bft%252f5aFN0dBqB2btL9X0QNtX7ZIsgv7dAGtJU1iIUftpufh6fKMmjqJFljfxsBKl3H5%252fvPyUO4CgVkuasbB%252fVeXOpek74Bdt%252bEstTxqyeeP5N9rWHbcw3dcfiT%252fVog29MQ%252bMwBmENfEWuMDpSloLgo7HR8JkL1PnpUomAGxFgW4t1EJX0LT%252fiwc%252fDPfaAqVPKp7Jp10nxNNnJxgrVhY4t%252fu7Bl9aIoGzgDILkX%252fUY0s8OH40HBB4l9q6l%252bKy%252fKc%253d; UserMatchHistory=AQIb6-i-uxgeggAAAZUxVLPInpQEUSVcxrpDNvIgViYlgzFHWmcD-bzgPWNGeL49He8fg2R-WPeXnPCyIb-d5sBqsuBWxCBySgXdp1iTWdH9m1HJLA2oDFYFUxwNwgwyif4iBtB92QxUIbCXEnsU7KE4ntTOCUtNwneUS8JSs25eAvAxUdzpb3p9IddlVpcnOGx2MOHwWPbQw6ZHsjoCTiZ7CAnnsQ1TI0bM7lKzRO1JvE1FXZVr76FwnITRsPwuJOLa_Dwbkle7YtLa-hfRk9sr9_Rs6QvsvrKPHWN6x9Ry9dE6-ip6JrsixCaK3LmnN91rNOeUMJa1wDHuZlNOiAtZRQahKiuIhak0B3ZO1rwbaWmE0Q; lidc="b=OB50:s=O:r=O:a=O:p=O:g=6562:u=434:x=1:i=1740289420:t=1740310997:v=2:sig=AQGXHxiAC5fPCBlzsrOq4dwbHw8lsluz"',
    'csrf-token': 'ajax:3421727281296924722',
}

def sleep(ms):
    time.sleep(ms / 1000.0)

def get_likes(post_id, start=0, count=100):
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
    try:
        response = requests.get(endpoint, headers=headers)
        response.raise_for_status()
        parsed_data = json.loads(response.text)
        feeds = parsed_data.get("data", {}).get("data", {}).get("feedDashProfileUpdatesByMemberShareFeed", {}).get("*elements", [])
        feed_ids = []
        feed_data = {}
        included = parsed_data.get("included", [])
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
    liId = "mayanktayal212"
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
