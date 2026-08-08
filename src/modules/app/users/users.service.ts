import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '@/modules/app/users/user.entity';
import { CreateUserDto } from '@/modules/app/users/dto/create-user.dto';
import { UpdateUserDto } from '@/modules/app/users/dto/update-user.dto';
import { BusinessException } from '@/common/exceptions/business.exception';
import { ErrorCode } from '@/common/exceptions/error-code.enum';
import { hashPassword } from '@/common/utils/bcrypt';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly repo: Repository<User>,
  ) {}

  async create(dto: CreateUserDto) {
    const exists = await this.repo.findOne({
      where: { username: dto.username },
    });
    if (exists) {
      BusinessException.throw(ErrorCode.USER_USERNAME_EXISTS);
    }

    const hashed = await hashPassword(dto.password);
    const user = this.repo.create({ ...dto, password: hashed });
    const saved = await this.repo.save(user);
    const { password: _password, ...result } = saved;
    void _password;
    return result;
  }

  async findAll(page = 1, pageSize = 10) {
    const [list, total] = await this.repo.findAndCount({
      skip: (page - 1) * pageSize,
      take: pageSize,
      order: { id: 'DESC' },
    });
    return { list, total, page, pageSize };
  }

  async findOne(id: number) {
    const user = await this.repo.findOneBy({ id });
    if (!user) {
      BusinessException.throw(ErrorCode.USER_NOT_FOUND, undefined, 404);
    }
    return user;
  }

  async findByUsername(username: string) {
    return this.repo.findOne({
      where: { username },
      select: {
        id: true,
        username: true,
        email: true,
        password: true,
      },
    });
  }

  async update(id: number, dto: UpdateUserDto) {
    await this.findOne(id);
    await this.repo.update(id, dto);
    return this.findOne(id);
  }

  async remove(id: number) {
    const user = await this.findOne(id);
    await this.repo.remove(user);
    return { id };
  }
}
