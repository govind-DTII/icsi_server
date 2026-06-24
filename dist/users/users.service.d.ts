import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
export declare class UsersService {
    private userRepo;
    constructor(userRepo: Repository<User>);
    findById(id: string): Promise<Omit<User, 'passwordHash'>>;
}
