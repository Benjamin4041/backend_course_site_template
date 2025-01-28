const JWT = require("jsonwebtoken");
async function userAuth(req, res, next) {
    try {
        const jwtToken = req.params.token
        let verified = JWT.verify(jwtToken, process.env.JWT_password)
        
    } catch (error) {

        return res.send({ message: error.message })
    }
} 