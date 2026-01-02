export class UserResponseDto {
  token?: string;
  id!: string;
  name!: string;
  lastname!: string;
  email!: string;
  username!: string;
  location!: string;
  roles!: string[];
}
