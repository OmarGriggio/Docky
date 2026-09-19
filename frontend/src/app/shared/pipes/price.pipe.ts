import { Pipe, PipeTransform } from '@angular/core';
import { formatPrice } from '../utils/display';

// `| price` for every price/amount shown in a template - see formatPrice.
@Pipe({
  name: 'price',
  standalone: true,
})
export class PricePipe implements PipeTransform {

  transform(value: number | null | undefined): string {
    return formatPrice(value);
  }

}
