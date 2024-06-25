// Imports
const express = require('express');
// Creates the App
const app = express();

const session = require('express-session')

const fs = require('fs');

// For socket.io
const { createServer } = require('node:http');
const { Server } = require('socket.io');

const server = createServer(app);
const io = new Server(server);


// For encrypting data
const bcrypt = require('bcrypt');

// Use urlencoded middleware from express
app.use(express.urlencoded({

    extended: true

}));

// Use a session middleware
app.use(session({

    secret: "secret",
    resave: true,
    username: '',
    logged_in: false,
    saveUninitialized: true

}))

// Loads files from public directory
app.use(express.static('public'));

// Sets the default view engine to .ejs
app.set('view engine', 'ejs');

var accounts;

// Updates data so you have the most recent users possible
async function update_data() {

    return new Promise(async (resolve, reject) => {

        accounts = await JSON.parse(await fs.readFileSync('accounts.json', 'utf-8'))
        resolve(accounts)

    })
}

// Authenticator
async function authenticate_account(username, password) {
    try {
        // Wait for data to fully load
        await update_data()

        // If accounts[username] is undefined, then the user doesn't exist
        if (!accounts[username]) {
            throw new Error("User Not Found")
        }

        // Compare password entered with the password hash stored with with the account
        let match = await bcrypt.compareSync(password, accounts[username].password)

        // If the match is false (not matching), throw an error
        if (!match) {
            throw new Error("Incorrect Password")
        }

        // This only runs if no errors were thrown, meaning the authentication was successful and you get logged in
        return true

    } catch (err) {

        // If an error was thrown, throw it back to the caller
        throw err;
    }
}

// Create Account
async function create_account(username, password) {

    try {
        // Waits for data to fully load
        await update_data()

        // If the username already exists then you can't create an account with the same username
        if (username in accounts) {
            throw new Error("Username Taken")
        }

        // Hashes the password with 10 salt rounds, encrypting it to be stored securely
        password_hash = await bcrypt.hashSync(password, 10)

        // Sets the new account with a key of [username] with the password and the account number
        accounts[username] = {

            password: password_hash,
            id: Object.keys(accounts).length + 1

        }

        // Only runs if no errors were thrown thus far, meaning your account was successfully created
        return accounts

    } catch (err) {

        // If an error was thrown, throw it back to the caller
        throw err

    }

}

// Notifies of a connection to the web socket (not currently used)
io.on('connection', (socket) => {

    console.log('A user has connected')

})


// When the blank directory is selected, redirect to /home
app.get('/', (req, res) => {

    res.redirect("/home");

})

// Render login.ejs when a 'GET' request is sent to /login
app.get('/login', (req, res) => {

    res.render("login")

})

// Render create.ejs when a 'GET' request is sent to /create
app.get('/create', (req, res) => {

    res.render("create")

})

// Render home.ejs when a 'GET' request is sent to /home AND you are logged in, otherwise you are redirected to the login page
app.get('/home', (req, res) => {

    if (req.session.logged_in) {
        res.render("home")

    } else {
        res.redirect("/login")

    }
})

// Deletes the account of the user when a 'GET' request is sent to /delete
app.get("/delete", async (req, res) => {

    await update_data()

    delete accounts[req.session.username]

    fs.writeFileSync('accounts.json', JSON.stringify(accounts))

    req.session.logged_in = false
    req.session.username = ""
    req.session.save()

})

// Logs out the user when a 'GET' request is sent to /logout
app.get("/logout", (req, res) => {

    req.session.logged_in = false
    req.session.username = ""
    res.session.save()

})

// Sends your session information to the home page when a 'GET' request is sent to /home_auth
app.get("/home_auth", (req, res) => {

    res.json({
        session: req.session
    })

})

// Runs when a 'POST' request is sent to /create_auth
app.post('/create_auth', async (req, res) => {

    // Sets username/password to the two objects sent in req.body
    const {
        username,
        password
    } = req.body

    try {

        // Create a new account (if an error is thrown from create_account, it also throws here, stopping the function)
        const new_accounts = await create_account(username, password)

        // If all is good, (no errors thrown), wait for the file to be rewritten with the new account data
        await fs.writeFileSync("accounts.json", JSON.stringify(new_accounts, null, 2))

        // Updates session information (logs you in to your new account)
        req.session.username = username
        req.session.logged_in = true

        // Saves the session and sends data back to the client telling it what to display/do
        req.session.save(() => {

            res.json({

                title: "Welcome!",
                redirect: "/home"

            })
        })

    } catch (err) {

        // If an error was thrown in create_account, render that error as a title and don't redirect
        res.json({
            title: err.message,
            redirect: false
        })
    }

})

// Runs when a 'POST' request is sent to /auth
app.post('/auth', async (req, res) => {

    // Sets username/password to the two objects sent in req.body
    const {
        username,
        password
    } = req.body;

    try {

        // Check if credentials are correct, (if an error is thrown from authenticate it will also throw here)
        const authorized = await authenticate_account(username, password);

        // If no errors are thrown, update session information
        req.session.username = username;
        req.session.logged_in = true;

        // Saves the sesssion and sends data back to the client telling it what to display/do
        req.session.save(() => {

            res.json({

                title: "Logged In!",
                redirect: "/home"

            })
        });

    } catch (err) {


        // If an error was thrown in authenticate, render that error and don't redirect
        res.json({

            title: err.message,
            redirect: false

        })
    }
})


// Sets up the server to listen for http://localhost:8080
const listener = server.listen(8080, () => {
    console.log(`Listening on port ${listener.address().port}`)
})
