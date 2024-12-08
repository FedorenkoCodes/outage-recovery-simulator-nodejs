const express = require('express');
const yaml = require('js-yaml');
const fs = require('node:fs');
const winston = require('winston');
const { format, transports } = require('winston');
const { combine, timestamp, printf } = format;

// Create an Express app instance
const app = express();
const routes = require('./app/routes');

// Custom Winston log format
const winstonLogFormat = printf(({ level, message, timestamp }) => {
  return `${timestamp} - ${level} - ${message}`;
});

// Configure Winston logger
const logger = winston.createLogger({
  format: combine(
    timestamp({ format: 'YYYY-MM-DDTHH:mm:ssZ' }),
    winstonLogFormat
  ),
  transports: [
    new transports.File({ filename: 'app.log', level: 'info' }), // Log info and above to app.log
    new transports.Console() // Log to the console
  ]
});

// Load YAML configuration file
const appConfig = yaml.load(fs.readFileSync('config.yaml', 'utf8'));
app.set('config', appConfig);


// Middleware to log requests and responses
app.use((request, response, next) => {
  request.logError = '';

  // Event listener that runs when the response is finished
  response.on('finish', () => {
    const logMessage = `${request.method} ${request.path} ${response.statusCode} - ${request.logError}`;
    response.statusCode < 499 ? logger.info(logMessage) : logger.error(logMessage);
  });
  next(); // Proceed to the next middleware
});

// Middleware to parse JSON request bodies
app.use(express.json());

// Mount the routes
app.use('/', routes);

// Error handling middleware
app.use((error, request, response, next) => {
  const errorStackLines = error.stack.split('\n');

  // Filter stack trace to remove node_modules lines for better readability
  const filteredErrorStack = errorStackLines.filter(line => !line.includes('node_modules')).join("\n");

  request.logError = filteredErrorStack;

  // Check if headers have already been sent; if so, it's too late to send a custom response
  if (response.headersSent) {
    return next(error); // Re-throw the error to let the server handle it (e.g., crash reporting)
  }

  // Send a generic 500 error response
  response.status(500).json({ error: 'An internal server error occurred' });
});

// Export the Express app for use in other modules
module.exports = app;
