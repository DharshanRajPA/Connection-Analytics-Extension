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

  async function scrapeConnections() {
    try {
      const topCard = await waitForElement('.pv-top-card--list');
      const connectionsText = topCard.querySelector('span[aria-hidden="true"]')?.textContent || '';
      const connectionCount = connectionsText.match(/(\d+,?\d*)/)?.[0]?.replace(',', '') || '0';
      return { totalConnections: connectionCount, lastUpdated: new Date().toLocaleString() };
    } catch (error) {
      console.error(error);
      return { totalConnections: '0', lastUpdated: new Date().toLocaleString() };
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

      // Clear any previous content in the section
      section.innerHTML = '';

      // Get the URL to your built React app's index.html
      const reactAppUrl = chrome.runtime.getURL('dist/index.html');

      // Create an iframe and set its attributes
      const iframe = document.createElement('iframe');
      iframe.src = reactAppUrl;
      iframe.style.width = '100%';
      iframe.style.height = '600px'; // Adjust the height as needed
      iframe.style.border = 'none';

      // Append the iframe to the section
      section.appendChild(iframe);
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

  window.addEventListener('load', () => setTimeout(insertFollowerSection, 1500));
  let lastUrl = location.href;
  new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      setTimeout(insertFollowerSection, 1500);
    }
  }).observe(document, { childList: true, subtree: true });
})();
