const router = require('express').Router();

//* sample front routing

router.get('/:client_id', (req, res) => {
	res.render(`client${req.params.client_id}`, {})
})

router.get('/test', (req, res) => {
	res.render('testClient', {})
})
module.exports = router;
