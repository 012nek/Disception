// RequestInterceptor.js

// Utility Function for Error Logging
const logError = (message, error) => {
  console.error(`[RequestInterceptor Error]: ${message}`, error);
};

// RuleEngine Class to Manage and Apply Rules
class RuleEngine {
  constructor(rules = []) {
    this.rules = rules;
  }

  /**
   * Adds a new rule to the engine.
   * @param {Object} rule - The rule object containing field, condition, and transform.
   */
  addRule(rule) {
    if (rule.field && typeof rule.field === 'string') {
      this.rules.push(rule);
    } else {
      console.warn("Invalid rule format. Each rule should have a 'field' property.");
    }
  }

  /**
   * Applies the first matching rule to the given content and field.
   * @param {string} content - The content to be transformed.
   * @param {string} field - The field in the request body to target.
   * @returns {Promise<string>} - The transformed content.
   */
  async apply(content, field) {
    for (const rule of this.rules) {
      if (rule.field === field && rule.condition(content)) {
        try {
          return (rule.transform.constructor.name === 'AsyncFunction') 
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

// Function to Modify the Request Body Based on Rules
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

// FetchInterceptor Class to Override the Fetch API
class FetchInterceptor {
  constructor(ruleEngine) {
    this.ruleEngine = ruleEngine;
    this.originalFetch = window.fetch.bind(window);
    this.init();
  }

  /**
   * Initializes the fetch interceptor by overriding the global fetch function.
   */
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

// XMLHttpRequestInterceptor Class to Override XMLHttpRequest
class XMLHttpRequestInterceptor {
  constructor(ruleEngine) {
    this.ruleEngine = ruleEngine;
    this.originalXhrOpen = XMLHttpRequest.prototype.open;
    this.originalXhrSend = XMLHttpRequest.prototype.send;
    this.init();
  }

  /**
   * Initializes the XMLHttpRequest interceptor by overriding open and send methods.
   */
  init() {
    const interceptor = this;
    
    // Override the open method to capture the URL
    XMLHttpRequest.prototype.open = function(method, url, ...rest) {
      this._url = url;
      return interceptor.originalXhrOpen.apply(this, [method, url, ...rest]);
    };

    // Override the send method to modify the request body
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

// RequestInterceptor Class to Manage Both Fetch and XMLHttpRequest Interceptors
class RequestInterceptor {
  /**
   * Constructs the RequestInterceptor with optional initial rules.
   * @param {Array<Object>} rules - An array of rule objects.
   */
  constructor(rules = []) {
    this.ruleEngine = new RuleEngine(rules);
    this.fetchInterceptor = new FetchInterceptor(this.ruleEngine);
    this.xhrInterceptor = new XMLHttpRequestInterceptor(this.ruleEngine);
    console.log("RequestInterceptor: All interceptors are active.");
  }

  /**
   * Adds a new rule to the RuleEngine.
   * @param {Object} rule - The rule object containing field, condition, and transform.
   */
  addRule(rule) {
    this.ruleEngine.addRule(rule);
  }
}

// Export the RequestInterceptor Class as the Default Export
export default RequestInterceptor;
