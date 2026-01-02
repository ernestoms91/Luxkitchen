import { activationTokenSchema, usersSchema } from "@modules/auth/entities";
const schema = {
  activationToken: activationTokenSchema,
  users: usersSchema  
};

export default schema;
