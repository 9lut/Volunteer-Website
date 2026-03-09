import express from 'express';
import bodyParser from 'body-parser';
import { json, urlencoded } from 'body-parser';
import { routes } from './routes'; // Assuming you have a routes file to define your routes

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Routes
app.use('/api', routes); // Adjust the base path as necessary

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});