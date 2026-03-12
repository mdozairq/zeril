import { Contract } from '@algorandfoundation/algorand-typescript'

export class Employer extends Contract {
  public hello(name: string): string {
    return `Hello, ${name}`
  }
}
