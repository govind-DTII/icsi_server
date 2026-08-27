import { UsersService } from './users.service';
export declare class UsersController {
    private readonly usersService;
    constructor(usersService: UsersService);
    getMe(req: any): Promise<Omit<import("../entities/user.entity").User, "passwordHash">>;
}
