const JWT = require("jsonwebtoken");

async function userAuth(req, res, next) {
    try {
        const jwtToken = req.params.token
        let verified = await JWT.verify(jwtToken, process.env.JWT_password)
        let userDetails = await User.findOne({verified.email})

        if(!verified){
            return res.send({message:'jwt expired or Deactevated',boolean:false})
        }

        if(!userDetails){
            return res.send({message:'User does not exsist',boolean:false})
        }
        req.user = verified
        return next()
    } catch (error) {

        return res.send({ message: error.message })
    }
}



module.exports = {
    userAuth
}