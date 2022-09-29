# FakeElectro API
An API made for my [FakeElectro](https://github.com/lokoydesign/fakeelectro) Project

## Products
### GET all products
```javascript
fetch('https://fakelectroapi.lokoydesign.com/products')
  .then((res) => res.json())
  .then((products) => console.log(products))
```

## Categories
### GET categories
```javascript
fetch('https://fakelectroapi.lokoydesign.com/categories')
  .then((res) => res.json())
  .then((categories) => console.log(categories))
```

## GET all products in a category
```javascript
fetch('https://fakelectroapi.lokoydesign.com/category/:slug')
  .then((res) => res.json())
  .then((products) => console.log(products))
```

## Product
### GET a product
```javascript
fetch('https://fakelectroapi.lokoydesign.com/product/:id')
  .then((res) => res.json())
  .then((product) => console.log(product))
```

### POST a new product
```javascript
fetch('https://fakelectroapi.lokoydesign.com/product', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`
  },
  body: JSON.stringify({
    name: 'Product name',
    category: 'category_slug',
    description: 'Product description.'
    price: 49.99,
    in_stock: 100
  })
}).then((res) => res.text())
  .then((productId) => console.log(productId))
```

### PUT an existing product
```javascript
fetch('https://fakelectroapi.lokoydesign.com/product/:id', {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`
  },
  body: JSON.stringify({
    name: 'A new product name',
    category: 'category_slug',
    description: 'A new product description.'
    price: 59.99,
    in_stock: 50
  })
})
```

### PATCH an existing product
```javascript
fetch('https://fakelectroapi.lokoydesign.com/product/:id', {
  method: 'PATCH',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`
  },
  body: JSON.stringify({
    description: 'A new product description.'
    price: 199.99,
  })
})
```

### DELETE a product
```javascript
fetch('https://fakelectroapi.lokoydesign.com/product/:id', {
  method: 'DELETE',
  headers: {
    Authorization: `Bearer ${token}`
  }
})
```

## Images
### GET all images
```javascript
fetch('https://fakelectroapi.lokoydesign.com/images')
  .then((res) => res.json())
  .then((images) => console.log(images))
```

## Image
### GET an image
```javascript
fetch('https://fakelectroapi.lokoydesign.com/image/:id')
  .then(res => res.blob())
  .then(imageBlob => {
      const imageObjectURL = URL.createObjectURL(imageBlob)
      console.log(imageObjectURL)
  })
```

### POST a new image
```javascript
const fileInputElement = document.getElementById('file-input')
const formData = new FormData()
imgFormData.set('file', fileInputElement.files[0])

fetch('https://fakelectroapi.lokoydesign.com/image', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${token}`
  },
  body: formData
})
```

### DELETE an image
```javascript
fetch('https://fakelectroapi.lokoydesign.com/image/:id', {
  method: 'DELETE',
  headers: {
    Authorization: `Bearer ${token}`
  }
})
```
