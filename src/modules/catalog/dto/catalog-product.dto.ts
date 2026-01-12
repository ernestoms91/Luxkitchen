export class CatalogProductDto {
  id: string;
  slug: string;
  title: string;
  price: string;
  stock: number;
  active: boolean;
  createdAt: Date;
  mainImage: string | null;
}
