const express = require('express');
const app = express();

const session = require('express-session')

const fs = require('fs');

const { createServer } = require('node:http');
const { Server } = require('socket.io');

const server = createServer(app);
const io = new Server(server);

const bcrypt = require('bcrypt');


app.use(express.urlencoded({

    extended: true

}));

app.use(session({

    secret: "secret",
    resave: true,
    username: '',
    logged_in: false,
    saveUninitialized: true

}))

app.use(express.static('public'));

app.set('view engine', 'ejs');

var accounts;

async function update_data() {

    return new Promise(async (resolve, reject) => {

        accounts = await JSON.parse(await fs.readFileSync('accounts.json', 'utf-8'))
        resolve(accounts)

    })
}


            password: password_hash,
            id: Object.keys(accounts).length + 1

        }

        return accounts

    } catch (err) {

        throw err

    }

}

io.on('connection', (socket) => {

    console.log('A user has connected')

})


app.get('/', (req, res) => {

    res.redirect("/login");

})

app.get('/login', (req, res) => {

    res.render("login")

})

app.get('/create', (req, res) => {

    res.render("create")

})

app.get('/home', (req, res) => {

    if (req.session.logged_in) {
        res.render("home")

    } else {
        res.redirect("/login")

    }
})

app.get("/delete", async (req, res) => {

    await update_data()

    delete accounts[req.session.username]

    fs.writeFileSync('accounts.json', JSON.stringify(accounts))

    req.session.logged_in = false
    req.session.username = ""
    req.session.save()

})

app.get("/logout", (req, res) => {

    req.session.logged_in = false
    req.session.username = ""
    res.session.save()

})

app.get("/home_auth", (req, res) => {

    res.json({
        session: req.session
    })

})

app.post('/create_auth', async (req, res) => {

    const {
        username,
        password
    } = req.body

    try {

        const new_accounts = await create_account(username, password)

        await fs.writeFileSync("accounts.json", JSON.stringify(new_accounts, null, 2))

        req.session.username = username
        req.session.logged_in = true
        req.session.save(() => {

            res.json({

                title: "Welcome!",
                redirect: true

            })
        })

    } catch (err) {
        res.json({
            title: err.message,
            redirect: false
        })
    }

})

app.post('/auth', async (req, res) => {

    const {
        username,
        password
    } = req.body;

    try {

        const authorized = await authenticate_account(username, password);

        req.session.username = username;
        req.session.logged_in = true;
        req.session.save(() => {

            res.json({

                title: "Logged In!",
                redirect: true

            })
        });

    } catch (err) {

        res.json({

            title: err.message,
            redirect: false

        })
    }
})


const listener = server.listen(8080, () => {
    console.log(`Listening on port ${listener.address().port}`)
})
