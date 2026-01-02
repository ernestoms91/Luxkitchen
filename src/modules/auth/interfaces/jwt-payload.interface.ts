export interface JwtPayload {
  id: number;
  tokenVersion: number;
  iat?: number;
  exp?: number;
  // TODO: añadir todo lo que quieran grabar.
}
