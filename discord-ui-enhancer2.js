// discord-ui-enhancer.js

const DiscordUIEnhancer = (() => {
    'use strict';

    /*** Configuration Module ***/
    const Config = {
        // Updated selectors to target username and message elements more reliably
        MESSAGE_SELECTOR: '[data-list-item-id]',
        USERNAME_SELECTOR: '[class*="headerText"] [role="button"]',
        BUTTON_PROCESSED_DATA_ATTR: 'data-hover-button-added',
        CUSTOM_BUTTON_CLASS: 'custom-hover-button',
        SVG_ICON: `
            <!-- Download Icon -->
            <svg viewBox="0 0 24 24" width="24" height="24" class="icon_e986d9" aria-hidden="true">
                <path fill="currentColor" d="M5 20h14v-2H5v2zm7-18l-7 7h4v6h6v-6h4l-7-7z"/>
            </svg>
        `,
        TEXT_COLOR: 'var(--text-normal)',
    };

    /*** Utility Functions Module ***/
    const Utils = (() => {
        /**
         * Creates a ripple effect on the target element.
         * @param {Event} event - The triggering event.
         * @param {HTMLElement} element - The target element.
         */
        function createRippleEffect(event, element) {
            const circle = document.createElement('span');
            const diameter = Math.max(element.clientWidth, element.clientHeight);
            const radius = diameter / 2;
            Object.assign(circle.style, {
                width: `${diameter}px`,
                height: `${diameter}px`,
                left: `${event.clientX - element.getBoundingClientRect().left - radius}px`,
                top: `${event.clientY - element.getBoundingClientRect().top - radius}px`,
                position: 'absolute',
                background: 'rgba(0, 0, 0, 0.2)',
                borderRadius: '50%',
                transform: 'scale(0)',
                animation: 'ripple 600ms linear',
                pointerEvents: 'none',
            });
            element.appendChild(circle);
            setTimeout(() => {
                circle.remove();
            }, 600);
        }

        /**
         * Displays a temporary notification near the specified element.
         * @param {HTMLElement} element - The reference element.
         * @param {string} message - The notification message.
         */
        function showTemporaryNotification(element, message) {
            const notification = document.createElement('div');
            notification.textContent = message;
            Object.assign(notification.style, {
                position: 'absolute',
                backgroundColor: 'var(--background-secondary)',
                color: Config.TEXT_COLOR,
                padding: '6px 12px',
                borderRadius: '4px',
                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
                top: `${element.offsetTop - element.offsetHeight - 10}px`,
                left: `${element.offsetLeft}px`,
                zIndex: '1001',
                opacity: '0',
                transition: 'opacity 0.2s ease-in-out',
                fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
                pointerEvents: 'none',
            });
            element.parentElement.appendChild(notification);
            requestAnimationFrame(() => {
                notification.style.opacity = '1';
            });
            setTimeout(() => {
                notification.style.opacity = '0';
                setTimeout(() => {
                    notification.remove();
                }, 200);
            }, 1500);
        }

        /**
         * Downloads a file from the given URL and saves it with the specified filename.
         * @param {string} url - The URL of the file to download.
         * @param {string} fileName - The name to save the file as.
         */
        function downloadFile(url, fileName) {
            fetch(url)
                .then(response => response.blob())
                .then(blob => {
                    const blobUrl = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = blobUrl;
                    link.download = fileName;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    URL.revokeObjectURL(blobUrl);
                })
                .catch(error => {
                    console.error('Error downloading file:', error);
                    showTemporaryNotification(document.body, 'Error downloading file.');
                });
        }

        return {
            createRippleEffect,
            showTemporaryNotification,
            downloadFile,
        };
    })();

    /*** Data Extraction Module ***/
    const DataExtractor = (() => {
        /**
         * Extracts user information from a message element.
         * @param {HTMLElement} message - The message element.
         * @returns {Object} - An object containing username and userId.
         */
        function extractUserInfo(message) {
            let userId = 'Unknown';
            const avatarImage = message.querySelector('img[src*="avatars"]');
            if (avatarImage) {
                const match = avatarImage.src.match(/\/avatars\/(\d+)/);
                if (match) {
                    userId = match[1];
                }
            }

            const usernameElement = message.querySelector(Config.USERNAME_SELECTOR);
            const username = usernameElement ? usernameElement.textContent.trim() : 'Unknown';

            return { username, userId };
        }

        return {
            extractUserInfo,
        };
    })();

    /*** Custom Hover Button Component ***/
    class CustomHoverButton {
        constructor() {
            this.init();
        }

        /**
         * Initializes the hover button functionality by attaching event listeners.
         */
        init() {
            const container = document.querySelector('[data-list-id="chat-messages"]') || document.body;
            container.addEventListener('mouseover', this.onMouseOver.bind(this), true);
            container.addEventListener('mouseout', this.onMouseOut.bind(this), true);
        }

        /**
         * Handles the mouseover event to add the custom hover button.
         * @param {Event} event - The mouseover event.
         */
        onMouseOver(event) {
            const usernameElement = event.target.closest(Config.USERNAME_SELECTOR);
            if (usernameElement && !usernameElement.hasAttribute(Config.BUTTON_PROCESSED_DATA_ATTR)) {
                const message = usernameElement.closest(Config.MESSAGE_SELECTOR);
                if (message) {
                    const customButton = this.createCustomButton(message);
                    usernameElement.parentElement.appendChild(customButton);
                    usernameElement.setAttribute(Config.BUTTON_PROCESSED_DATA_ATTR, 'true');
                }
            }
        }

        /**
         * Handles the mouseout event to remove the custom hover button.
         * @param {Event} event - The mouseout event.
         */
        onMouseOut(event) {
            const usernameElement = event.target.closest(Config.USERNAME_SELECTOR);
            if (usernameElement && !usernameElement.contains(event.relatedTarget)) {
                if (usernameElement.hasAttribute(Config.BUTTON_PROCESSED_DATA_ATTR)) {
                    const customButton = usernameElement.parentElement.querySelector(`.${Config.CUSTOM_BUTTON_CLASS}`);
                    customButton?.remove();
                    usernameElement.removeAttribute(Config.BUTTON_PROCESSED_DATA_ATTR);
                }
            }
        }

        /**
         * Creates the custom hover button element.
         * @param {HTMLElement} message - The message element to associate with the button.
         * @returns {HTMLElement} - The custom button element.
         */
        createCustomButton(message) {
            const button = document.createElement('div');
            button.className = `button_f7e168 ${Config.CUSTOM_BUTTON_CLASS}`;
            button.setAttribute('role', 'button');
            button.setAttribute('tabindex', '0');
            button.setAttribute('aria-label', 'Download Audio');
            button.innerHTML = Config.SVG_ICON;
            Object.assign(button.style, {
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '24px',
                height: '24px',
                cursor: 'pointer',
                marginLeft: '4px',
                color: 'var(--interactive-normal)',
                position: 'relative',
                overflow: 'hidden',
                fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
                transition: 'box-shadow 0.3s ease-in-out',
            });

            // Hover and Click Effects
            button.addEventListener('mouseover', () => {
                button.style.color = 'var(--interactive-hover)';
                button.style.boxShadow = '0 0 8px rgba(0, 175, 244, 0.8)';
            });
            button.addEventListener('mouseout', () => {
                button.style.color = 'var(--interactive-normal)';
                button.style.boxShadow = 'none';
            });

            button.addEventListener('click', async (event) => {
                event.stopPropagation();
                Utils.createRippleEffect(event, button);

                const audioElement = message.querySelector('audio');
                if (audioElement) {
                    const sourceElement = audioElement.querySelector('source');
                    if (sourceElement && sourceElement.src) {
                        const audioUrl = sourceElement.src;
                        const userInfo = DataExtractor.extractUserInfo(message);
                        const userId = userInfo.userId || 'Unknown';
                        const randomifier = Math.random().toString(36).substring(2, 15);
                        const fileName = `${userId}-${randomifier}.ogg`;

                        Utils.downloadFile(audioUrl, fileName);
                        Utils.showTemporaryNotification(button, 'Audio file downloading...');
                    } else {
                        Utils.showTemporaryNotification(button, 'No audio source found.');
                    }
                } else {
                    Utils.showTemporaryNotification(button, 'No audio element found.');
                }
            });

            // Keyboard Accessibility
            button.addEventListener('keydown', (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    button.click();
                }
            });

            return button;
        }
    }

    /*** Styles Module ***/
    const Styles = (() => {
        /**
         * Injects custom CSS styles into the document.
         */
        function addStyles() {
            const styleSheet = document.createElement('style');
            styleSheet.type = 'text/css';
            styleSheet.innerText = `
                /* Ripple effect */
                @keyframes ripple {
                    to {
                        transform: scale(4);
                        opacity: 0;
                    }
                }
                /* Button hover effect */
                .${Config.CUSTOM_BUTTON_CLASS}:hover {
                    background-color: var(--background-modifier-hover);
                    border-radius: 4px;
                }
                /* Temporary Notification Styles */
                .temporary-notification {
                    position: absolute;
                    background-color: var(--background-secondary);
                    color: ${Config.TEXT_COLOR};
                    padding: 6px 12px;
                    border-radius: 4px;
                    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
                    z-index: 1001;
                    opacity: 0;
                    transition: opacity 0.2s ease-in-out;
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    pointer-events: none;
                }
            `;
            document.head.appendChild(styleSheet);
        }

        return {
            addStyles,
        };
    })();

    /*** Main Application Module ***/
    const App = {
        /**
         * Initializes the Discord UI Enhancer.
         */
        init() {
            Styles.addStyles();
            new CustomHoverButton();
        }
    };

    return {
        init: App.init
    };
})();

window.DiscordUIEnhancer = DiscordUIEnhancer;
