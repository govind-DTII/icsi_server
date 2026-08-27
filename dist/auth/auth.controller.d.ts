import { AuthService } from './auth.service';
import { LoginDto } from './login.dto';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    login(dto: LoginDto): Promise<{
        token: string;
        user: Partial<import("../entities/user.entity").User>;
    }>;
    logout(): Promise<{
        success: boolean;
        message: string;
    }>;
}
