import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { ReceivingService } from './receiving.service';
import { CreateReceivingDto } from './dto/create-receiving.dto';

@Controller('receiving')
export class ReceivingController {
  constructor(private readonly receivingService: ReceivingService) {}

  @Post()
  create(@Body() createReceivingDto: CreateReceivingDto) {
    return this.receivingService.create(createReceivingDto);
  }

  @Get()
  findAll(@Query('companyId') companyId: string) {
    return this.receivingService.findAll(companyId);
  }
}
