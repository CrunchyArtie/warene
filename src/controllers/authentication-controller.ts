import bcrypt from 'bcrypt';
import Cryptr from 'cryptr';
import {User} from '../models';
import {AppDataSource} from '../utils/app-data-source';

const userRepository = AppDataSource.getRepository(User);

class AuthenticationController {
    private cryptr: Cryptr;

    constructor() {
        this.cryptr = new Cryptr(process.env.ENCRYPT_KEY || 'myTotallySecretKey');
    }

    public async authenticate (username: string, password: string): Promise<User | null> {
        const user = await userRepository.findOneBy({username})

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

    encode(str: string): string {
        return this.cryptr.encrypt(str);
    }

    decode(str: string): string {
        return this.cryptr.decrypt(str);
    }

    compare(password: string, hash: string): boolean {
        return bcrypt.compareSync(password, hash)
    }
}

export default new AuthenticationController();
