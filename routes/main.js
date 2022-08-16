const router = require('express').Router();

//* sample front routing

router.get('/1', (req, res) => {
	res.render('client1', {})
})
router.get('/2', (req, res) => {
	res.render('client2', {})
})
router.get('/3', (req, res) => {
	res.render('client3', {})
})

router.get('/test', (req, res) => {
	res.render('testClient', {})
})
module.exports = router;
