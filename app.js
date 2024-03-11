const server = require('./server');
const database = require('./database');

server.listen(3000, async () => {
    console.log(`Server started on port ${3000}`)
    try {
        database.sequelize.authenticate().then(() => {
            console.log('Sequelize connection has been established successfully');
        });

        process.on('SIGINT', () => {
            database.sequelize.close().then(() => {
                console.log('Sequelize connection closed');
                process.exit();
            });
        });
    } catch (error) {
        console.error('Unable to connect to the database:', error);
    }
});