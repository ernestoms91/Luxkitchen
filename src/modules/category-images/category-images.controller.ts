import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CategoryImagesService } from '@modules/category-images/category-images.service';
import { CategoryImagePipe } from '@modules/category-images/pipes/category-image.pipe';
import { Auth } from '@modules/auth/decorators';

@Controller('v1/category-images')
export class CategoryImagesController {
  constructor(private readonly categoryImagesService: CategoryImagesService) {}

  @Post('upload/:categoryId')
  @Auth()
  @UseInterceptors(FileInterceptor('file'))
  async uploadImage(
    @UploadedFile(CategoryImagePipe) file: Express.Multer.File,
    @Param('categoryId') categoryId: string,
  ) {
    const image = await this.categoryImagesService.uploadImage(
      +categoryId,
      file,
    );

    return {
      ok: true,
      message: 'Image uploaded successfully',
    };
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.categoryImagesService.remove(+id);

    return {
      ok: true,
      message: `Category image ${id} successfully deleted`,
    };
  }
}
