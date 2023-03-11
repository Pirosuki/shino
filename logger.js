// Imports logging module
const winston = require('winston')

// Creates logger
const logger = winston.createLogger({
    format: winston.format.combine(
        winston.format.errors({stack: true}),
        winston.format.json()
    ),
    transports: [
        new winston.transports.File({
            filename: './logs/latest.log'
        }),
        new winston.transports.Console()
    ],
    exceptionHandlers: [
        new winston.transports.File({
            filename: './logs/latest.log'
        }),
        new winston.transports.Console()
    ]
})

// Exports logger
module.exports = logger;