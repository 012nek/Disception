// discord-ui-enhancer.js

const DiscordUIEnhancer = (() => {
    'use strict';

    /*** Configuration Module ***/
    const Config = {
        MESSAGE_SELECTOR: '.message_d5deea',
        MESSAGE_LIST_ITEM_SELECTOR: '.messageListItem_d5deea',
        BUTTON_CONTAINER_SELECTOR: '.buttonsInner_d5deea',
        CUSTOM_BUTTON_CLASS: 'custom-hover-button',
        MESSAGE_SUMMARY_BUTTON_CLASS: 'message-summary-button',
        BUTTON_PROCESSED_DATA_ATTR: 'data-hover-button-added',
        USERNAME_SELECTOR: '.username_f9f2ca',
        AVATAR_SELECTOR: 'img.avatar_f9f2ca',
        MESSAGE_CONTENT_SELECTOR: '.messageContent_f9f2ca',
        REPLY_CONTEXT_SELECTOR: '.repliedMessage_f9f2ca',
        TEXT_COLOR: 'var(--text-normal)',
        HYPERLINK_COLOR: '#00AFF4',
        SVG_ICON: `
            <!-- Question Mark Icon matching Discord's style -->
            <svg viewBox="0 0 24 24" width="24" height="24" class="icon_e986d9" aria-hidden="true">
                <path fill="currentColor" d="M12 2C6.47 2 2 6.47 2 12s4.47 10 10
                10 10-4.47 10-10S17.53 2 12 2zm1 17h-2v-2h2zm1.07-7.75l-.9.92A1.49
                1.49 0 0 0 13 14h-2v-.5a2.5 2.5 0 0 1 .7-1.78l1.2-1.2A2.31
                2.31 0 1 0 10 9H8a4 4 0 1 1 8 0 3.38 3.38 0 0 1-1.93 3.25z"/>
            </svg>
        `,
        API_URL: 'http://44.204.3.124:8000/user',
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
         * Copies the provided text to the clipboard.
         * @param {string} text - The text to copy.
         */
        function copyToClipboard(text) {
            navigator.clipboard.writeText(text).catch((err) => {
                console.error('Failed to copy text: ', err);
            });
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

        return {
            createRippleEffect,
            copyToClipboard,
            showTemporaryNotification,
        };
    })();

    /*** Data Extraction Module ***/
    const DataExtractor = (() => {
        /**
         * Extracts the Guild ID from the URL pathname.
         * @returns {string} - The Guild ID or 'Unknown'.
         */
        function extractGuildId() {
            const pathSegments = window.location.pathname.split('/');
            return pathSegments[2] || 'Unknown';
        }

        /**
         * Extracts the username from a message element.
         * @param {HTMLElement} message - The message element.
         * @returns {string} - The username or 'Unknown'.
         */
        function extractUsernameFromMessage(message) {
            const usernameElement = message.querySelector(Config.USERNAME_SELECTOR);
            return usernameElement ? usernameElement.textContent.trim() : 'Unknown';
        }

        /**
         * Extracts the User ID from a message's avatar image.
         * @param {HTMLElement} message - The message element.
         * @returns {string|null} - The User ID or null.
         */
        function extractUserIdFromMessage(message) {
            const avatarImage = message.querySelector(`${Config.AVATAR_SELECTOR}:not(.replyAvatar_f9f2ca)`);
            if (avatarImage && avatarImage.src) {
                const match = avatarImage.src.match(/\/(?:avatars|users)\/(\d+)/);
                if (match) {
                    return match[1];
                }
            }
            return null;
        }

        /**
         * Finds the previous message element in the message list.
         * @param {HTMLElement} message - The current message element.
         * @returns {HTMLElement|null} - The previous message element or null.
         */
        function findPreviousMessage(message) {
            let messageListItem = message.closest(Config.MESSAGE_LIST_ITEM_SELECTOR);
            if (messageListItem) {
                let previousMessageListItem = messageListItem.previousElementSibling;
                while (previousMessageListItem) {
                    const previousMessage = previousMessageListItem.querySelector(Config.MESSAGE_SELECTOR);
                    if (previousMessage) {
                        return previousMessage;
                    }
                    previousMessageListItem = previousMessageListItem.previousElementSibling;
                }
            }
            return null;
        }

        /**
         * Extracts user information from a message element.
         * @param {HTMLElement} message - The message element.
         * @returns {Object} - An object containing user and message information.
         */
        function extractUserInfo(message) {
            let currentMessage = message;
            let username = extractUsernameFromMessage(currentMessage);
            let userId = extractUserIdFromMessage(currentMessage);

            while (!userId && currentMessage) {
                currentMessage = findPreviousMessage(currentMessage);
                if (currentMessage) {
                    userId = extractUserIdFromMessage(currentMessage);
                    if (username === 'Unknown') {
                        username = extractUsernameFromMessage(currentMessage);
                    }
                }
            }

            if (!userId) {
                userId = 'Unknown';
                console.warn('User ID could not be extracted.');
            }

            const messageContentElement = message.querySelector(Config.MESSAGE_CONTENT_SELECTOR);
            const messageContent = messageContentElement ? messageContentElement.textContent.trim() : '';

            const timestampElement = message.querySelector('time');
            const timestamp = timestampElement ? timestampElement.getAttribute('datetime') : '';

            const guildId = extractGuildId();

            return { username, userId, messageContent, timestamp, guildId };
        }

        return {
            extractGuildId,
            extractUsernameFromMessage,
            extractUserIdFromMessage,
            findPreviousMessage,
            extractUserInfo,
        };
    })();

    /*** API Interaction Module ***/
    const API = {
        fetchUserData(userId, guildId, httpRequest) {
            const targetUrl = `${Config.API_URL}?user_id=${userId}&guild_id=${guildId}`;

            return new Promise((resolve) => {
                if (httpRequest) {
                    // Use GM_xmlhttpRequest if provided
                    httpRequest({
                        method: "GET",
                        url: targetUrl,
                        headers: {
                            "Content-Type": "application/json",
                        },
                        onload(response) {
                            if (response.status >= 200 && response.status < 300) {
                                try {
                                    const data = JSON.parse(response.responseText);
                                    resolve(data);
                                } catch (e) {
                                    console.error('Error parsing response JSON:', e);
                                    resolve(null);
                                }
                            } else {
                                console.error(`API request failed with status ${response.status}`);
                                resolve(null);
                            }
                        },
                        onerror(err) {
                            console.error('Error fetching user data:', err);
                            resolve(null);
                        }
                    });
                } else {
                    // Fallback to fetch if GM_xmlhttpRequest is not available
                    fetch(targetUrl, {
                        method: "GET",
                        headers: {
                            "Content-Type": "application/json",
                        }
                    }).then(response => {
                        if (response.ok) {
                            return response.json();
                        }
                        throw new Error('Network response was not ok.');
                    }).then(data => {
                        resolve(data);
                    }).catch(error => {
                        console.error('Fetch API error:', error);
                        resolve(null);
                    });
                }
            });
        }
    };

    /*** Window Manager Module ***/
    const WindowManager = (() => {
        let anchoredWindows = [];

        /**
         * Calculates the next available horizontal position for anchored windows.
         * @returns {number} - The left position in pixels.
         */
        function getNextAvailablePosition() {
            const baseLeft = 10;
            const windowWidth = 320; // Width of the window including margin
            const totalWidth = windowWidth + 10; // Add 10px gap

            const nextPosition = baseLeft + (anchoredWindows.length * totalWidth);
            if (nextPosition + windowWidth > window.innerWidth) {
                return baseLeft;
            }
            return nextPosition;
        }

        /**
         * Registers a new anchored window.
         * @param {HTMLElement} windowElement - The window element to register.
         */
        function registerWindow(windowElement) {
            anchoredWindows.push(windowElement);
        }

        /**
         * Unregisters an existing anchored window.
         * @param {HTMLElement} windowElement - The window element to unregister.
         */
        function unregisterWindow(windowElement) {
            anchoredWindows = anchoredWindows.filter(win => win !== windowElement);
            realignWindows();
        }

        /**
         * Realigns all anchored windows based on their registration order.
         */
        function realignWindows() {
            anchoredWindows.forEach((win, index) => {
                const baseLeft = 10;
                const windowWidth = 320;
                const totalWidth = windowWidth + 10;
                const leftPosition = baseLeft + (index * totalWidth);
                win.style.left = `${leftPosition}px`;
            });
        }

        return {
            getNextAvailablePosition,
            registerWindow,
            unregisterWindow,
            realignWindows,
        };
    })();

    /*** Window Base Classes ***/
    class Window {
        /**
         * Creates a draggable popup window.
         * @param {HTMLElement} content - The content to display inside the window.
         * @param {string} title - The title of the window.
         * @param {HTMLElement} anchorElement - The element to anchor the window to.
         */
        constructor(content, title, anchorElement) {
            this.content = content;
            this.title = title;
            this.anchorElement = anchorElement;
            this.createWindow();
        }

        /**
         * Initializes and appends the window to the DOM.
         */
        createWindow() {
            this.windowElement = document.createElement('div');
            this.windowElement.className = 'custom-popup-window';
            Object.assign(this.windowElement.style, {
                position: 'absolute',
                backgroundColor: 'var(--background-secondary)',
                color: Config.TEXT_COLOR,
                padding: '16px',
                width: '300px',
                boxShadow: '0 8px 16px rgba(0, 0, 0, 0.2)',
                display: 'flex',
                flexDirection: 'column',
                borderRadius: '8px',
                zIndex: '1000',
                cursor: 'grab',
                userSelect: 'none',
                transition: 'all 0.3s ease-in-out',
            });

            // Header with Title and Exit Button
            const header = document.createElement('div');
            Object.assign(header.style, {
                marginBottom: '8px',
                borderBottom: '1px solid var(--background-modifier-accent)',
                paddingBottom: '8px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                cursor: 'grab',
            });

            const titleElement = document.createElement('div');
            titleElement.textContent = this.title;
            Object.assign(titleElement.style, {
                fontSize: '18px',
                fontWeight: 'bold',
                color: Config.TEXT_COLOR,
                fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
            });

            // Exit Button
            const exitButton = this.createExitButton();

            header.appendChild(titleElement);
            header.appendChild(exitButton);
            this.windowElement.appendChild(header);

            // Content Wrapper
            const contentWrapper = document.createElement('div');
            Object.assign(contentWrapper.style, {
                overflowY: 'auto',
                maxHeight: '300px',
                fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
            });
            contentWrapper.appendChild(this.content);
            this.windowElement.appendChild(contentWrapper);

            // Append the window to the body
            document.body.appendChild(this.windowElement);

            // Position the window
            this.positionWindow();

            // Make the window draggable
            this.makeDraggable(header);
        }

        /**
         * Creates the exit button for the window.
         * @returns {HTMLElement} - The exit button element.
         */
        createExitButton() {
            const exitButton = document.createElement('button');
            exitButton.innerHTML = `
                <svg width="20" height="20" viewBox="0 0 24 24">
                    <path fill="var(--interactive-normal)" d="M18.3 5.71a1 1 0 00-1.42 0L12 10.59 7.11 5.7a1 1 0 00-1.42 1.42L10.59 12l-4.9 4.89a1 1 0 101.42 1.42L12 13.41l4.89 4.9a1 1 0 001.42-1.42L13.41 12l4.9-4.89a1 1 0 000-1.42z"></path>
                </svg>
            `;
            Object.assign(exitButton.style, {
                background: 'none',
                border: 'none',
                padding: '0',
                cursor: 'pointer',
                outline: 'none',
                transition: 'transform 0.2s ease-in-out',
            });

            exitButton.addEventListener('mouseover', () => {
                exitButton.querySelector('path').style.fill = 'var(--interactive-hover)';
                exitButton.style.transform = 'scale(1.1)';
            });
            exitButton.addEventListener('mouseout', () => {
                exitButton.querySelector('path').style.fill = 'var(--interactive-normal)';
                exitButton.style.transform = 'scale(1)';
            });
            exitButton.addEventListener('click', () => {
                this.windowElement.remove();
            });

            return exitButton;
        }

        /**
         * Positions the window relative to the anchor element.
         */
        positionWindow() {
            const anchorRect = this.anchorElement.getBoundingClientRect();
            const windowRect = this.windowElement.getBoundingClientRect();

            let top = anchorRect.top - windowRect.height - 10; // 10px gap
            if (top < 0) {
                top = anchorRect.bottom + 10; // If not enough space above, show below
            }
            let left = anchorRect.left + (anchorRect.width / 2) - (windowRect.width / 2);
            if (left < 0) {
                left = 10; // Minimum margin
            } else if (left + windowRect.width > window.innerWidth) {
                left = window.innerWidth - windowRect.width - 10; // Keep within viewport
            }

            this.windowElement.style.top = `${top + window.scrollY}px`;
            this.windowElement.style.left = `${left + window.scrollX}px`;
        }

        /**
         * Makes the window draggable via the specified handle element.
         * @param {HTMLElement} handleElement - The element used to drag the window.
         */
        makeDraggable(handleElement) {
            let isDragging = false;
            let startX = 0;
            let startY = 0;
            let initialX = 0;
            let initialY = 0;

            const onMouseDown = (event) => {
                isDragging = true;
                startX = event.clientX;
                startY = event.clientY;
                const rect = this.windowElement.getBoundingClientRect();
                initialX = rect.left;
                initialY = rect.top;
                this.windowElement.style.transition = 'none';
                this.windowElement.style.cursor = 'grabbing';
                handleElement.style.cursor = 'grabbing';
                document.addEventListener('mousemove', onMouseMove);
                document.addEventListener('mouseup', onMouseUp);
            };

            const onMouseMove = (event) => {
                if (!isDragging) return;
                const deltaX = event.clientX - startX;
                const deltaY = event.clientY - startY;
                this.windowElement.style.left = `${initialX + deltaX}px`;
                this.windowElement.style.top = `${initialY + deltaY}px`;
            };

            const onMouseUp = () => {
                if (!isDragging) return;
                isDragging = false;
                this.windowElement.style.cursor = 'grab';
                handleElement.style.cursor = 'grab';
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);

                // Snap to edge if close
                this.snapToEdge();
            };

            handleElement.addEventListener('mousedown', onMouseDown);
        }

        /**
         * Snaps the window to the nearest edge if within a threshold.
         */
        snapToEdge() {
            const rect = this.windowElement.getBoundingClientRect();
            const threshold = 20; // Snap threshold in pixels

            // Snap to left edge
            if (rect.left <= threshold) {
                this.windowElement.style.left = '0px';
            }
            // Snap to right edge
            if (window.innerWidth - rect.right <= threshold) {
                this.windowElement.style.left = `${window.innerWidth - rect.width}px`;
            }
            // Snap to top edge
            if (rect.top <= threshold) {
                this.windowElement.style.top = '0px';
            }
            // Snap to bottom edge
            if (window.innerHeight - rect.bottom <= threshold) {
                this.windowElement.style.top = `${window.innerHeight - rect.height}px`;
            }
        }
    }

    class AnchoredWindow {
        /**
         * Creates an anchored window that aligns horizontally.
         * @param {HTMLElement} content - The content to display inside the window.
         * @param {string} title - The title of the window.
         */
        constructor(content, title) {
            this.content = content;
            this.title = title;
            this.createWindow();
        }

        /**
         * Initializes and appends the anchored window to the DOM.
         */
        createWindow() {
            this.windowElement = document.createElement('div');
            this.windowElement.className = 'anchored-window';
            Object.assign(this.windowElement.style, {
                position: 'fixed',
                top: '10px',
                left: `${WindowManager.getNextAvailablePosition()}px`,
                backgroundColor: 'var(--background-secondary)',
                color: Config.TEXT_COLOR,
                padding: '16px',
                width: '300px',
                boxShadow: '0 8px 16px rgba(0, 0, 0, 0.2)',
                display: 'flex',
                flexDirection: 'column',
                borderTopLeftRadius: '0px',
                borderTopRightRadius: '0px',
                borderBottomLeftRadius: '8px',
                borderBottomRightRadius: '8px',
                zIndex: '1000',
                cursor: 'grab',
                userSelect: 'none',
                transition: 'all 0.3s ease-in-out',
            });

            // Header with Title and Exit Button
            const header = document.createElement('div');
            Object.assign(header.style, {
                marginBottom: '8px',
                borderBottom: '1px solid var(--background-modifier-accent)',
                paddingBottom: '8px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                cursor: 'grab',
            });

            const titleElement = document.createElement('div');
            titleElement.textContent = this.title;
            Object.assign(titleElement.style, {
                fontSize: '18px',
                fontWeight: 'bold',
                color: Config.TEXT_COLOR,
                fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
            });

            // Exit Button
            const exitButton = this.createExitButton();

            header.appendChild(titleElement);
            header.appendChild(exitButton);
            this.windowElement.appendChild(header);

            // Content Wrapper
            const contentWrapper = document.createElement('div');
            Object.assign(contentWrapper.style, {
                overflowY: 'auto',
                maxHeight: '300px',
                fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
            });
            contentWrapper.appendChild(this.content);
            this.windowElement.appendChild(contentWrapper);

            // Append the window to the body
            document.body.appendChild(this.windowElement);

            // Register the window
            WindowManager.registerWindow(this.windowElement);

            // Make the window draggable horizontally
            this.makeDraggable(header);
        }

        /**
         * Creates the exit button for the anchored window.
         * @returns {HTMLElement} - The exit button element.
         */
        createExitButton() {
            const exitButton = document.createElement('button');
            exitButton.innerHTML = `
                <svg width="20" height="20" viewBox="0 0 24 24">
                    <path fill="var(--interactive-normal)" d="M18.3 5.71a1 1 0 00-1.42 0L12 10.59 7.11 5.7a1 1 0 00-1.42 1.42L10.59 12l-4.9 4.89a1 1 0 101.42 1.42L12 13.41l4.89 4.9a1 1 0 001.42-1.42L13.41 12l4.9-4.89a1 1 0 000-1.42z"></path>
                </svg>
            `;
            Object.assign(exitButton.style, {
                background: 'none',
                border: 'none',
                padding: '0',
                cursor: 'pointer',
                outline: 'none',
                transition: 'transform 0.2s ease-in-out',
            });

            exitButton.addEventListener('mouseover', () => {
                exitButton.querySelector('path').style.fill = 'var(--interactive-hover)';
                exitButton.style.transform = 'scale(1.1)';
            });
            exitButton.addEventListener('mouseout', () => {
                exitButton.querySelector('path').style.fill = 'var(--interactive-normal)';
                exitButton.style.transform = 'scale(1)';
            });
            exitButton.addEventListener('click', () => {
                this.windowElement.remove();
                WindowManager.unregisterWindow(this.windowElement);
            });

            return exitButton;
        }

        /**
         * Makes the anchored window draggable horizontally.
         * @param {HTMLElement} handleElement - The element used to drag the window.
         */
        makeDraggable(handleElement) {
            let isDragging = false;
            let startX = 0;
            let initialX = 0;

            const onMouseDown = (event) => {
                isDragging = true;
                startX = event.clientX;
                const rect = this.windowElement.getBoundingClientRect();
                initialX = rect.left;
                this.windowElement.style.transition = 'none';
                this.windowElement.style.cursor = 'grabbing';
                handleElement.style.cursor = 'grabbing';
                document.addEventListener('mousemove', onMouseMove);
                document.addEventListener('mouseup', onMouseUp);
            };

            const onMouseMove = (event) => {
                if (!isDragging) return;
                const deltaX = event.clientX - startX;
                this.windowElement.style.left = `${initialX + deltaX}px`;
            };

            const onMouseUp = () => {
                if (!isDragging) return;
                isDragging = false;
                this.windowElement.style.cursor = 'grab';
                handleElement.style.cursor = 'grab';
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
            };

            handleElement.addEventListener('mousedown', onMouseDown);
        }
    }

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
            const message = event.target.closest(Config.MESSAGE_SELECTOR);
            if (message && !message.hasAttribute(Config.BUTTON_PROCESSED_DATA_ATTR)) {
                const buttonsContainer = message.querySelector(Config.BUTTON_CONTAINER_SELECTOR);
                if (buttonsContainer) {
                    const customButton = this.createCustomButton(message);
                    buttonsContainer.appendChild(customButton);
                    message.setAttribute(Config.BUTTON_PROCESSED_DATA_ATTR, 'true');
                }
            }
        }

        /**
         * Handles the mouseout event to remove the custom hover button.
         * @param {Event} event - The mouseout event.
         */
        onMouseOut(event) {
            const message = event.target.closest(Config.MESSAGE_SELECTOR);
            if (message && !message.contains(event.relatedTarget)) {
                if (message.hasAttribute(Config.BUTTON_PROCESSED_DATA_ATTR)) {
                    const customButton = message.querySelector(`.${Config.CUSTOM_BUTTON_CLASS}`);
                    customButton?.remove();
                    message.removeAttribute(Config.BUTTON_PROCESSED_DATA_ATTR);
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
            button.setAttribute('aria-label', 'Show Profile Overview');
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

                const userInfo = DataExtractor.extractUserInfo(message);

                if (userInfo.userId !== 'Unknown' && userInfo.guildId !== 'Unknown') {
                    // Fetch user data from external API
                    const apiResponse = await API.fetchUserData(userInfo.userId, userInfo.guildId);

                    if (apiResponse && apiResponse.profile_data) {
                        const windowContent = this.generateProfileOverviewContent(userInfo, apiResponse.profile_data);
                        new Window(windowContent, 'Profile Overview', button);
                    } else {
                        // Handle error
                        const errorContent = document.createElement('div');
                        errorContent.textContent = 'Failed to fetch user data.';
                        new Window(errorContent, 'Error', button);
                    }
                } else {
                    const errorContent = document.createElement('div');
                    errorContent.textContent = 'Insufficient user information.';
                    new Window(errorContent, 'Error', button);
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

        /**
         * Generates the content for the Profile Overview window.
         * @param {Object} userData - The extracted user data.
         * @param {Object} profileData - The profile data from the API.
         * @returns {HTMLElement} - The content element.
         */
        generateProfileOverviewContent(userData, profileData) {
            const content = document.createElement('div');
            Object.assign(content.style, {
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                color: Config.TEXT_COLOR,
            });

            const usernameField = this.createField('Username', userData.username);
            content.appendChild(usernameField);

            const userIdField = this.createField('User ID', userData.userId);
            content.appendChild(userIdField);

            const guildIdField = this.createField('Guild ID', userData.guildId);
            content.appendChild(guildIdField);

            // Add Message Summary Button
            const summaryButton = document.createElement('div');
            summaryButton.className = Config.MESSAGE_SUMMARY_BUTTON_CLASS;
            summaryButton.textContent = 'Message Summary';
            Object.assign(summaryButton.style, {
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '6px 12px',
                backgroundColor: 'var(--background-modifier-hover)',
                color: Config.TEXT_COLOR,
                borderRadius: '4px',
                cursor: 'pointer',
                fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
                userSelect: 'none',
                alignSelf: 'flex-start',
                transition: 'box-shadow 0.3s ease-in-out',
            });

            // Hover Effect
            summaryButton.addEventListener('mouseover', () => {
                summaryButton.style.backgroundColor = 'var(--interactive-hover)';
                summaryButton.style.boxShadow = '0 0 8px rgba(0, 175, 244, 0.8)';
            });
            summaryButton.addEventListener('mouseout', () => {
                summaryButton.style.backgroundColor = 'var(--background-modifier-hover)';
                summaryButton.style.boxShadow = 'none';
            });

            summaryButton.addEventListener('click', () => {
                this.showMessageSummary(profileData);
                Utils.showTemporaryNotification(summaryButton, 'Opened Message Summary');
            });

            content.appendChild(summaryButton);

            return content;
        }

        /**
         * Creates a labeled field with a copyable value.
         * @param {string} labelText - The label text.
         * @param {string} valueText - The value text.
         * @returns {HTMLElement} - The field element.
         */
        createField(labelText, valueText) {
            const field = document.createElement('div');
            Object.assign(field.style, {
                display: 'flex',
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                position: 'relative',
            });

            const label = document.createElement('span');
            label.textContent = labelText;
            Object.assign(label.style, {
                fontWeight: 'bold',
                color: Config.TEXT_COLOR,
                fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
            });
            field.appendChild(label);

            const value = document.createElement('span');
            value.textContent = valueText;
            Object.assign(value.style, {
                color: Config.TEXT_COLOR,
                fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
                cursor: 'pointer',
                padding: '2px 4px',
                borderRadius: '4px',
            });

            // Hover Effect
            value.addEventListener('mouseover', () => {
                value.style.backgroundColor = 'var(--background-modifier-hover)';
            });
            value.addEventListener('mouseout', () => {
                value.style.backgroundColor = 'transparent';
            });

            // Click to Copy
            value.addEventListener('click', () => {
                Utils.copyToClipboard(valueText);
                Utils.showTemporaryNotification(field, 'Copied!');
            });

            field.appendChild(value);

            return field;
        }

        /**
         * Displays a Message Summary window based on profile data.
         * @param {Object} profileData - The profile data from the API.
         */
        showMessageSummary(profileData) {
            const summaryContent = document.createElement('div');
            Object.assign(summaryContent.style, {
                color: Config.TEXT_COLOR,
                fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
            });

            const mutualGuilds = profileData.mutual_guilds || [];
            const mutualGuildsCount = mutualGuilds.length;

            const field = this.createField('Mutual Guilds', mutualGuildsCount.toString());
            summaryContent.appendChild(field);

            // List of Mutual Guild IDs
            if (mutualGuildsCount > 0) {
                const guildsList = document.createElement('ul');
                Object.assign(guildsList.style, {
                    listStyleType: 'none',
                    padding: '0',
                    margin: '0',
                });

                mutualGuilds.forEach((guild) => {
                    const guildItem = document.createElement('li');
                    guildItem.textContent = `Guild ID: ${guild.id}`;
                    Object.assign(guildItem.style, {
                        padding: '4px 0',
                        cursor: 'pointer',
                        transition: 'background-color 0.2s ease',
                    });
                    guildItem.addEventListener('click', () => {
                        Utils.copyToClipboard(guild.id);
                        Utils.showTemporaryNotification(guildItem, 'Guild ID Copied!');
                    });
                    // Hover Effect
                    guildItem.addEventListener('mouseover', () => {
                        guildItem.style.backgroundColor = 'var(--background-modifier-hover)';
                    });
                    guildItem.addEventListener('mouseout', () => {
                        guildItem.style.backgroundColor = 'transparent';
                    });
                    guildsList.appendChild(guildItem);
                });
                summaryContent.appendChild(guildsList);
            }

            new AnchoredWindow(summaryContent, 'Message Summary');
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
                .${Config.CUSTOM_BUTTON_CLASS}:hover,
                .${Config.MESSAGE_SUMMARY_BUTTON_CLASS}:hover {
                    background-color: var(--background-modifier-hover);
                    border-radius: 4px;
                }
                /* Custom popup window */
                .custom-popup-window {
                    animation: fadeIn 0.2s ease-in-out;
                }
                @keyframes fadeIn {
                    from {
                        opacity: 0;
                        transform: translateY(-10px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                /* Scrollbar styling */
                .custom-popup-window::-webkit-scrollbar,
                .anchored-window::-webkit-scrollbar {
                    width: 8px;
                }
                .custom-popup-window::-webkit-scrollbar-track,
                .anchored-window::-webkit-scrollbar-track {
                    background: var(--background-tertiary);
                }
                .custom-popup-window::-webkit-scrollbar-thumb,
                .anchored-window::-webkit-scrollbar-thumb {
                    background: var(--scrollbar-thin-thumb);
                    border-radius: 4px;
                }
                .custom-popup-window::-webkit-scrollbar-thumb:hover,
                .anchored-window::-webkit-scrollbar-thumb:hover {
                    background: var(--scrollbar-thin-thumb-hover);
                }
                /* Anchored window styles */
                .anchored-window {
                    animation: fadeIn 0.2s ease-in-out;
                }
                .anchored-window {
                    border-top-left-radius: 0;
                    border-top-right-radius: 0;
                    border-bottom-left-radius: 8px;
                    border-bottom-right-radius: 8px;
                }
            `;
            document.head.appendChild(styleSheet);
        }

        return {
            addStyles,
        };
    })();

    const App = {
        init(httpRequest) {
            Styles.addStyles();
            new CustomHoverButton(httpRequest);  // Pass the GM_xmlhttpRequest
        }
    };

    return {
        init: App.init
    };
})();

window.DiscordUIEnhancer = DiscordUIEnhancer;
