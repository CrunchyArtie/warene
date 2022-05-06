import bcrypt from 'bcrypt';
import {User} from '../models';


export const AuthenticationController = {
    authenticate: async (username: string, password: string) => {
        const user = await User.findOne({
            where: {username}
        })

        if (!user) {
            return null;
        }

        if (!AuthenticationController.compare(password, user.password)) {
            return null
        }

        return user;

    },
    hashPassword: (pwd: string) => {
        const salt = bcrypt.genSaltSync(10)
        return bcrypt.hashSync(pwd, salt)
    },
    compare: (password: string, hash: string) => {
        return bcrypt.compareSync(password, hash)
    }
}
