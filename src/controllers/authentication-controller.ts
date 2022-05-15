import bcrypt from 'bcrypt';
import {User} from '../models';


class AuthenticationController {
    public async authenticate (username: string, password: string): Promise<User | null> {
        const user = await User.findOne({
            where: {username}
        })

        if (!user) {
            return null;
        }

        if (!this.compare(password, user.password)) {
            return null
        }

        return user;

    }

    hashPassword(pwd: string): string {
        const salt = bcrypt.genSaltSync(10)
        return bcrypt.hashSync(pwd, salt)
    }

    compare(password: string, hash: string): boolean {
        return bcrypt.compareSync(password, hash)
    }
}

export default new AuthenticationController();
