const express = require("express");
const socketio = require('socket.io');
const http = require('http');
const cors = require('cors');
const router = require('./router');

const app = express();
app.use(cors());

const httpServer = http.createServer(app);

const io = socketio(httpServer, {
    cors: {
        origin: "*",
        methods: ["GET", "POST", "PUT", "DELETE"],
        credentials: true
    }
});

const PORT = process.env.PORT || 5000;

app.use(router);

// client connection
io.on('connection', (socket) => {
    console.log('New connection');

    socket.on('joinRoom', ({ name, room }) => {
        const existingUser = getUser(socket.id)
        const currentUsers = getRoomUsers(room)
        const roomsList = getRooms();

        if (existingUser) {
            console.log('existing user prev info', existingUser)
            if (existingUser.username !== name) {
                changeName(socket.id, name)
                socket.emit('message', formatMessage('', `You are now known as ${existingUser.username} `))
            }
            if (existingUser.room !== room) {
                changeRoom(socket.id, room)
                socket.emit('message', formatMessage('', 'Room changed!'))
                socket.join(existingUser.room)
                socket.emit('message', formatMessage('', `Users current in ${existingUser.room}: ${currentUsers}`))
                io.to(existingUser.room).emit('message', formatMessage('', `${existingUser.username} joins!`))
            }
            console.log('existing user new info', existingUser)
        } else {
            const newUser = userJoin(socket.id, name, room)
            socket.emit('message', formatMessage('', 'Welcome!'))
            console.log('new user', newUser)
            socket.join(newUser.room)
            socket.emit('message', formatMessage('', `Users current in ${newUser.room}: ${currentUsers}`))
            io.to(newUser.room).emit('message', formatMessage('', `${newUser.username} joins!`))
        }
    })

    // listen to chat message from client
    socket.on('chatInput', msg => {
        const user = getUser(socket.id)
        if (user) io.to(user.room).emit('message', formatMessage(`${user.username}`, msg))
    })

    // User left
    socket.on('disconnection', () => {
        console.log('disconnect!')
        const user = userLeave(socket.id);
        if (user) io.to(user.room).emit('message', formatMessage('', `${user.username} has left!`))
    })


})


httpServer.listen(PORT, () => {
    console.log(`Server running on ${PORT}`);
});

const moment = require('moment');
const formatMessage = (username, text) => {
    return {
        id: Date.now(),
        username,
        text,
        time: moment().format('h:mm a'),
    }
}

const users = [];
const userJoin = (id, username, room) => {
    let user = { id, username, room }
    users.push(user)
    return user
}
console.log(users)

const getUser = (id) => {
    return users.find((item => item.id === id))
}

const userLeave = (id) => {
    let index = users.findIndex(item => item.id === id)
    if (index !== -1) return users.splice(index, 1)[0]
}

const getRoomUsers = (room) => {
    return users.filter(item => item.room === room).map((item => item.username)).join(',')
}

const getRooms = () => {
    const set = new Set(users.map(item => item.room))
    return Array.from(set).sort()
}

const changeName = (id, newName) => {
    users.find((item => item.id === id)).username = newName
}

const changeRoom = (id, newRoom) => {
    users.find((item => item.id === id)).room = newRoom
}