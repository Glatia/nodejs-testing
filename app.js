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

var title;

function update_data() {
    fs.readFile('accounts.json', (error, data) => {
        if (error) throw error;
        else accounts = JSON.parse(data);
        console.log(accounts)
    })
}

io.on('connection', (socket) => {
    console.log('A user has connected')
})


app.get('/', (req, res) => {
    res.redirect('/login');
})

app.get('/login', (req, res) => {
    res.render("login")
})

app.get('/create', (req, res) => {
    res.render("create")
})

app.get('/home', (req, res) => {
    res.json({
        session: req.session
    })
})

app.post('/create_auth', (req, res) => {
    update_data()
    setTimeout(() => {
        const create_auth = new Promise((resolve, reject) => {
            let users = []
            accounts.forEach(account => {
                users.push(account.username);
            })
            if (users.includes(req.body.username)) {
                reject('Username Taken');
            } else {
                resolve('Account Created');
            }
        })
        create_auth.then(
            (value) => {
                console.log(value)
                bcrypt.hash(req.body.password, 10, (err, hash) => {

                    accounts[accounts.length] = {
                        username: req.body.username,
                        password: hash
                    }
                    fs.writeFileSync('accounts.json', JSON.stringify(accounts, null, 2));
                    req.session.username = req.body.username;
                    req.session.logged_in = true;
                    req.session.save(async () => {
                        console.log(req.session)
                    })
                    res.json({
                        title: "Logged In!"
                    })
                })
            }, (error) => {
                console.log(error);
                req.session.username = req.body.username;
                req.session.logged_in = false;
                req.session.save(async () => {
                    console.log(req.session)
                })
                res.json({
                    title: error
                })
            }
        )
    }, 10)
})

app.post('/auth', (req, res) => {
    update_data()
    setTimeout(() => {
        const check_auth = new Promise((resolve, reject) => {
            let i = 0
            if (accounts.length > 0) {
                accounts.forEach((account) => {
                    if (account.username == req.body.username) {
                        bcrypt.compare(req.body.password, account.password, (err, same) => {
                            if (err) throw err;
                            else {
                                if (same) {
                                    resolve("Logged In")
                                } else {
                                    reject("Password Incorrect")
                                }
                            }
                        })
                    } else {
                        i++
                        if (i >= accounts.length) {
                            reject("Username Invalid")
                        }
                    }
                })
            } else {
                reject("Username Invalid")
            }
        })
        check_auth.then(
            (value) => {
                console.log(value);
                req.session.username = req.body.username
                req.session.logged_in = true;
                req.session.save(() => {
                    console.log(req.session)
                })

                res.json({
                    title: "Logged In!"
                })

            }, (error) => {
                console.log(error)
                req.session.username = req.body.username;
                req.session.logged_in = false
                req.session.save(() => {
                    console.log(req.session)
                })

                res.json({
                    title: error
                })
            }
        )
    }, 10)
})
const listener = server.listen(8080, () => {
    console.log(`Listening on port ${listener.address().port}`)
})
