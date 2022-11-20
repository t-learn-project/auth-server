const {User} = require('../models/user-model');
const bcrypt = require('bcrypt');
//const uuid = require('uuid');
const mailService = require('./mail-service');
const tokenService = require('./token-service');
const UserDto = require('../dtos/user-dto');
const ApiError = require('../exceptions/api-error');
const { where } = require('sequelize');

class UserService {

    async registration(email, password) {    
        const candidate = await User.findOne( {where:{ email }})        
        if (candidate) {
          throw ApiError.BadRequest(`Пользователь с почтовым адресом ${email} уже существует`)
        }
        const hashPassword = await bcrypt.hash(password, 3);
        const activationLink =await  mailService.getRandomNumber(); 
        const user = await User.create({email, password: hashPassword, activationLink})
      //C  await mailService.sendActivationMail(email,activationLink);



        const userDto = new UserDto(user); // id, email, isActivated
        const tokens = tokenService.generateTokens({...userDto});      
        await tokenService.saveToken(userDto.id, tokens.refreshToken);
        return {...tokens, user: userDto}
    }



    // далее с клиента я буду получать  в теле эту цифру 
     // и если она будет совпадать с той что мы тут сгенерировали 
      // то будем предоставлять доступ к приложению аналогично с 
       //подтверждением на почте

// сама проверка будет проходить   activate(activationLink) запросом
// клиент будет присылать запрос  в котором будет эта циферка с БД
// после отправки будет отправляться асинхронная функция в которой параметром будет циферка 
// мы ее проверяем 

    async activate(activationLink) {
        const user = await User.findOne({activationLink})
        if (!user) {
          throw ApiError.BadRequest('Неккоректная ссылка активации')
        }
        user.isActivated = true;
        await user.save();
    }

    async login(email, password) {

        const user = await User.findOne({where:{email:email}})

        
        if (!user) {
            throw ApiError.BadRequest('Пользователь с таким email не найден')
        }
        const isPassEquals = await bcrypt.compare(password, user.password);
        if (!isPassEquals) {
            throw ApiError.BadRequest('Неверный пароль');
        }
        const userDto = new UserDto(user);
        const tokens = tokenService.generateTokens({...userDto});

        await tokenService.saveToken(userDto.id, tokens.refreshToken);
        return {...tokens, user: userDto}
    }

    // async logout(refreshToken) {
    //     const token = await tokenService.removeToken(refreshToken);
    //     return token;
    // }

    // async refresh(refreshToken) {
    //     if (!refreshToken) {
    //         throw ApiError.UnauthorizedError();
    //     }
    //     const userData = tokenService.validateRefreshToken(refreshToken);
    //     const tokenFromDb = await tokenService.findToken(refreshToken);
    //     if (!userData || !tokenFromDb) {
    //         throw ApiError.UnauthorizedError();
    //     }
    //     const user = await UserModel.findById(userData.id);
    //     const userDto = new UserDto(user);
    //     const tokens = tokenService.generateTokens({...userDto});

    //     await tokenService.saveToken(userDto.id, tokens.refreshToken);
    //     return {...tokens, user: userDto}
    // }

    // async getAllUsers() {
    //     const users = await UserModel.find();
    //     return users;
    // }
}

module.exports = new UserService();


//UserModule заменил на {User}