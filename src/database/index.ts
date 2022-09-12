import { ObjectId } from 'mongodb'
import mongoose, { Schema } from 'mongoose'

export interface Product {
  _id: ObjectId,
  name: string,
  category: ObjectId,
  description?: string,
  price: number,
  image: ObjectId,
  in_stock: number,
  rating: {
    rate: number,
    count: number
  },
  __v: number
}

const productSchema = new Schema<Product>({
  name: {
    type: String,
    required: true
  },
  category: {
    type: mongoose.Types.ObjectId,
    required: true
  },
  description: {
    type: String,
    default: '',
  },
  price: {
    type: Number,
    default: 100,
    required: true
  },
  image: mongoose.Types.ObjectId,
  in_stock: {
    type: Number,
    default: 0,
    required: true
  },
  rating: {
    required: true,
    type: {
      rate: {
        type: Number,
        required: true
      },
      count: {
        type: Number,
        required: true
      }
    }
  }
})

export interface Category {
  _id: ObjectId,
  slug: string,
  name: string,
  __v: number
}

const categorySchema = new Schema<Category>({
  slug: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  }
})

export const Product = mongoose.model<Product>('Product', productSchema)
export const Category = mongoose.model<Category>('Category', categorySchema)
