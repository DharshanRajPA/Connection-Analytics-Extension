// content.js front end logic for removing the ad section and displaying user connections section
(function () {
  const adObserver = new MutationObserver(() => {
    document.querySelectorAll(
      '.ad-banner-container, .premium-upsell-link, div[data-view-name="premium-hub-entity-item"]'
    ).forEach(el => el.remove());
  });
  adObserver.observe(document.body, { childList: true, subtree: true });

  function waitForElement(selector, timeout = 10000) {
    return new Promise((resolve, reject) => {
      const el = document.querySelector(selector);
      if (el) return resolve(el);
      const observer = new MutationObserver(() => {
        const el = document.querySelector(selector);
        if (el) {
          observer.disconnect();
          resolve(el);
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });
      setTimeout(() => {
        observer.disconnect();
        reject(new Error(`Element ${selector} not found`));
      }, timeout);
    });
  }

  async function scrapeInfo() {
    try {
      const artDecoCard = document.querySelector('.artdeco-card');
      const h1Tag = artDecoCard.querySelector('h1');
      const Name = h1Tag.innerHTML;
      const imgTag = artDecoCard.querySelectorAll('img');
      const divTag = artDecoCard.querySelectorAll('div');
      let ProfilePicture = null;
      let Description = null;
      imgTag.forEach(img => {
        if (img.alt == Name || img.alt == (Name + ', #HIRING')) {
          ProfilePicture = img;
        }
      });
      const walker = document.createTreeWalker(
        artDecoCard,
        NodeFilter.SHOW_ELEMENT,
        {
          acceptNode: function (node) {
            return NodeFilter.FILTER_ACCEPT;
          }
        }
      );
      walker.currentNode = h1Tag;
      let foundNode = null;
      let currentNode = null;
      while ((currentNode = walker.nextNode())) {
        if (
          currentNode.tagName.toLowerCase() == 'div' &&
          currentNode.classList.contains('text-body-medium')
        ) {
          foundNode = currentNode;
          Description = currentNode;
          break;
        }
      }
      return {
        Name: Name,
        ProfilePicture: ProfilePicture.src,
        Description: Description.innerHTML
      };
    } catch (error) {
      console.error(error);
      return {
        Name: null,
        ProfilePicture: null,
        Description: null
      };
    }
  }

  async function insertFollowerSection() {
    try {
      const aside = await waitForElement('.scaffold-layout__aside');
      let section = document.getElementById('follower-list-section');
      if (!section) {
        section = document.createElement('div');
        section.id = 'follower-list-section';
        section.className = 'artdeco-card pv-profile-card break-words mt2';
        aside.prepend(section);
      }
      const Info = await scrapeInfo();

      section.innerHTML = '';

      const reactAppUrl = chrome.runtime.getURL('dist/index.html');

      const iframe = document.createElement('iframe');
      iframe.src = reactAppUrl;
      iframe.style.width = '300px';
      iframe.style.height = '323px';
      iframe.style.border = '0px';
      iframe.style.borderStyle = 'Solid';
      iframe.style.borderColor = 'Gray';
      iframe.style.borderTopLeftRadius = '8px';
      iframe.style.borderTopRightRadius = '8px';

      section.appendChild(iframe);
      iframe.onload = function () {
        try {
          iframe.contentWindow.postMessage({ type: 'PROFILE_DATA', payload: Info }, '*');
        } catch (error) {
          console.error('Error extracting profile data:', error);
        }
      };

      // Send data to the iframe using postMessage
      //iframe.contentWindow.postMessage({ type: 'PROFILE_DATA', payload: Info }, "*");

      /* window.addEventListener('message', (event) => {
        if (event.origin != chrome.runtime.getURL('').slice(0, -1)) return; // Ensure message comes from your extension

        if (event.data.type == 'REQUEST_ELEMENT') {
          console.log('Received element request from iframe');

          // Example: Send element data to the iframe
          const someData = { message: "Hello from the parent page!" };
          iframe.contentWindow.postMessage({ type: 'ELEMENT_DATA', payload: someData }, event.origin);
        }
      });

       iframe.onload = function () {
        try {
          const iframeDoc = iframe.contentWindow.document; // Access the iframe's document
          const ProfileName = iframeDoc.getElementById('profile-name');
          const ProfilePicture = iframeDoc.getElementById('profile-picture');
          const ProfileDescription = iframeDoc.getElementById('profile-description');
          ProfileName.innerHTML = Info.Name;
          ProfilePicture.src = Info.ProfilePicture;
          ProfileDescription.innerHTML = Info.Description;
        } catch (error) {
          console.error('Error accessing iframe contents:', error);
        }
      };*/

    } catch (error) {
      console.error('Error inserting follower section:', error);
    }
  }

  const globalObserver = new MutationObserver(() => {
    if (!document.getElementById('follower-list-section')) {
      insertFollowerSection();
    }
  });
  globalObserver.observe(document.body, { childList: true, subtree: true });

  window.addEventListener('load', () => setTimeout(insertFollowerSection, 100));
  let lastUrl = location.href;
  new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      setTimeout(insertFollowerSection, 100);
    }
  }).observe(document, { childList: true, subtree: true });
})();
