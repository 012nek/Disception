// requestInterceptor.js
const RequestInterceptorModule = (() => {
    // Utility function for error logging
    const logError = (message, error) => {
        console.error(`[RequestInterceptor Error]: ${message}`, error);
    };

    // RuleEngine class to manage and apply rules
    class RuleEngine {
        constructor(rules = []) {
            this.rules = rules;
        }

        addRule(rule) {
            if (rule.field && typeof rule.field === 'string') {
                this.rules.push(rule);
            } else {
                console.warn("Invalid rule format. Each rule should have a 'field' property.");
            }
        }

        async apply(content, field) {
            for (const rule of this.rules) {
                if (rule.field === field && rule.condition(content)) {
                    try {
                        return rule.transform.constructor.name === 'AsyncFunction'
                            ? await rule.transform(content)
                            : rule.transform(content);
                    } catch (err) {
                        logError(`Error applying rule on field "${field}".`, err);
                        return content;
                    }
                }
            }
            return content;
        }
    }

    // Function to modify the request body based on rules
    const modifyRequestBody = async (body, ruleEngine) => {
        try {
            const parsedBody = JSON.parse(body);
            for (const [field, value] of Object.entries(parsedBody)) {
                if (typeof value === 'string') {
                    parsedBody[field] = await ruleEngine.apply(value, field);
                }
            }
            return JSON.stringify(parsedBody);
        } catch (err) {
            logError("Error modifying body.", err);
            return body;
        }
    };

    // FetchInterceptor class to override the fetch API
    class FetchInterceptor {
        constructor(ruleEngine) {
            this.ruleEngine = ruleEngine;
            this.originalFetch = window.fetch.bind(window);
            this.init();
        }

        init() {
            window.fetch = async (...args) => {
                const [url, options = {}] = args;
                if (options.body) {
                    try {
                        options.body = await modifyRequestBody(options.body, this.ruleEngine);
                        console.log(`Fetch request to ${url} modified successfully.`);
                    } catch (err) {
                        logError(`Failed to modify fetch request to ${url}.`, err);
                    }
                }
                return this.originalFetch(url, options);
            };
            console.log("Fetch Interceptor Initialized.");
        }
    }

    // XMLHttpRequestInterceptor class to override XMLHttpRequest
    class XMLHttpRequestInterceptor {
        constructor(ruleEngine) {
            this.ruleEngine = ruleEngine;
            this.originalXhrOpen = XMLHttpRequest.prototype.open;
            this.originalXhrSend = XMLHttpRequest.prototype.send;
            this.init();
        }

        init() {
            const interceptor = this;

            XMLHttpRequest.prototype.open = function(method, url, ...rest) {
                this._url = url;
                return interceptor.originalXhrOpen.apply(this, [method, url, ...rest]);
            };

            XMLHttpRequest.prototype.send = function(body) {
                const xhr = this;
                if (body) {
                    modifyRequestBody(body, interceptor.ruleEngine)
                        .then(modifiedBody => {
                            console.log(`XMLHttpRequest to ${xhr._url} modified successfully.`);
                            interceptor.originalXhrSend.call(xhr, modifiedBody);
                        })
                        .catch(err => {
                            logError(`Failed to modify XMLHttpRequest to ${xhr._url}.`, err);
                            interceptor.originalXhrSend.call(xhr, body);
                        });
                } else {
                    interceptor.originalXhrSend.call(xhr, body);
                }
            };

            console.log("XMLHttpRequest Interceptor Initialized.");
        }
    }

    // RequestInterceptor class to manage both fetch and XMLHttpRequest interceptors
    class RequestInterceptor {
        constructor(rules = []) {
            this.ruleEngine = new RuleEngine(rules);
            this.fetchInterceptor = new FetchInterceptor(this.ruleEngine);
            this.xhrInterceptor = new XMLHttpRequestInterceptor(this.ruleEngine);
            console.log("RequestInterceptor: All interceptors are active.");
        }

        addRule(rule) {
            this.ruleEngine.addRule(rule);
        }
    }

    return {
        RequestInterceptor,
        RuleEngine,
        logError,
    };
})();

// Export for Node.js or make globally accessible in the browser
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RequestInterceptorModule;
} else {
    window.RequestInterceptorModule = RequestInterceptorModule;
}
