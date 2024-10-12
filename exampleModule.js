// exampleModule.js
const ExampleModule = {
    greet: function() {
        console.log("Hello from ExampleModule on GitHub!");
    },
    logMessage: function(message) {
        console.log(`[ExampleModule] Message: ${message}`);
    }
};

// Export the module for Node.js and browser
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ExampleModule;
} else {
    window.ExampleModule = ExampleModule;
}
