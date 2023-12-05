const express = require('express')
const path = require('path')
const crypto = require('crypto')
const mongoose = require('mongoose')
const multer = require('multer')
const GridFsStorage = require('multer-gridfs-storage')
const GridFsStream = require('gridfs-stream')
const methodOverride = require('method-override')
const bodyParser = require('body-parser')

const app = express()

app.set('view engine', 'ejs')

app.use(bodyParser.json())
app.use(methodOverride('_method'))

// 数据库的链接
const mongoURL = 'mongodb://localhost:27017/grid_uploads'

const connect = mongoose.createConnection(mongoURL, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})

let gfs;
connect.once('open', () => {
    gfs = GridFsStream(connect.db, mongoose.mongo)
    gfs.collection('upload')
})

const storage = new GridFsStorage({
    url: mongoURL,
    file: (req, file) => {
        return new Promise((resolve, reject) => {
            // crypto.randomBytes(16, (err, buf) => {
            //     if (err) {
            //         return reject(err)
            //     }
            //     const filename = buf.toString('hex') + path.extname(file.originalname)
            //     const fileinfo = {
            //         filename,
            //         bucketName: 'upload'
            //     }
            //     resolve(fileinfo)
            // })
            const fileinfo = {
                filename: new Date() + '-' + file.originalname,
                bucketName: 'upload'
            }
            resolve(fileinfo)
        })
    }
})

const upload = multer({ storage })



app.get('/', (req, res) => {
    gfs.files.find().toArray((err, files) => {
        if (!files || files.length === 0) {
            res.render('index', { files: false })
            return
        }
        files.map(file => {
            const imageType = ['image/png', 'image/jpg', 'image/gif', 'image/jpeg']
            if (imageType.includes(file.contentType)) {
                file.isImage = true
            } else {
                file.isImage = false
            }
        })
        res.render('index', { files: files })
    })
})

app.post('/upload', upload.single('file'), (req, res) => {
    res.redirect('/')
})

app.get('/files', (req, res) => {
    gfs.files.find().toArray((err, files) => {
        if (!files || files.length === 0) {
            return res.status(404).json({
                err: '文件不存在！'
            })
        }
        return res.json(files)
    })
})

app.get('/files/:filename', (req, res) => {
    gfs.files.findOne({ filename: req.params.filename }, (err, file) => {
        if (!file) {
            return res.status(404).json({
                err: '文件不存在！'
            })
        }
        return res.json(file)
    })
})

app.get('/download/:filename', (req, res) => {
    gfs.files.findOne({ filename: req.params.filename }, (err, file) => {
        if (!file) {
            return res.status(404).json({
                err: '文件不存在！'
            })
        }
        const readstream = gfs.createReadStream(file.filename)
        readstream.pipe(res)
    })
})

app.get('/image/:filename', (req, res) => {
    gfs.files.findOne({ filename: req.params.filename }, (err, file) => {
        if (!file) {
            return res.status(404).json({
                err: '文件不存在！'
            })
        }
        const imageType = ['image/png', 'image/jpg', 'image/gif', 'image/jpeg']
        if (imageType.includes(file.contentType)) {
            const readstream = gfs.createReadStream(file.filename)
            readstream.pipe(res)
        } else {
            return res.status(404).json({
                err: '非图片'
            })
        }
    })
})

app.delete('/files/:id', (req, res) => {
    gfs.remove({ _id: req.params.id, root: 'upload' }, (err) => {
        if (err) {
            return res.status(404).json({
                err: '删除的文件不存在！'
            })
        }
        res.redirect('/')
    })
})

const port = 5000
app.listen(port, () => {
    console.log(`App listering on port ${port}`)
})