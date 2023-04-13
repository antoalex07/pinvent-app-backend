const asyncHandler = require("express-async-handler");
const Product = require("../models/productModel");
const { fileSizeFormatter } = require("../utils/fileUpload");
const cloudinary = require("cloudinary").v2;

const createProduct = asyncHandler(async (req, res) => {
    const {name, sku, category, quantity, price, description} = req.body;
   // console.log("formdata reached here");
    //Validation
    if(!name || !category || !price || !description || !quantity){
        res.status(400);
        throw new Error("Fill in all fields");
    }

    //Manage image upload
    let fileData = {}
    if(req.file) {
        let uploadedFile;
        try {
            uploadedFile = await cloudinary.uploader.upload((req.file.path), {folder: "Pinvent App", resource_type: "image"})
        } catch (error) {
            res.status(500);
            console.log(error.message);
            throw new Error({message: error.message});
        }

        fileData = {
            fileName: req.file.originalname,
            filePath: uploadedFile.secure_url,
            fileType: req.file.mimetype,
            fileSize: fileSizeFormatter(req.file.size, 2),
        }
    }

    //create product
    const product = await Product.create({
        user: req.user.id,
        name,
        sku,
        category,
        quantity,
        price,
        description,
        image: fileData
    });
    res.status(201).json(product);
});

const getProducts = asyncHandler(async (req, res) => {
    const products = await Product.find({user: req.user.id}).sort("-createdAt")
    res.status(200).json(products);
})

const getProduct = asyncHandler(async (req, res) => {
    const product = await Product.findById(req.params.id);
    if(!product){
        res.status(404);
        throw new Error("Product not found");
    }

    if(product.user.toString() !== req.user.id){
        res.status(401);
        throw new Error("User not Authorized");
    }

    res.status(200).json(product);
})

const deleteProduct = asyncHandler(async (req, res) => {
    const product = await Product.findById(req.params.id);
    if(!product){
        res.status(404);
        throw new Error("Product not found");
    }
    if(product.user.toString() !== req.user.id){
        res.status(401);
        throw new Error("User not Authorized");
    }
    await product.deleteOne();
    res.status(200).json(product);    
})

const updateProduct = asyncHandler(async (req, res) => {
    const {name, category, quantity, price, description} = req.body;

    const {id} = req.params;

    const product = await Product.findById(id)
    
    if(!product){
        res.status(404);
        throw new Error("Product not found");
    }
    
    if(product.user.toString() !== req.user.id){
        res.status(401);
        throw new Error("User not Authorized");
    }
    
    //Manage image upload
    let fileData = {}
    if(req.file) {
        let uploadedFile;
        try {
            uploadedFile = await cloudinary.uploader.upload((req.file.path), {folder: "Pinvent App", resource_type: "image"})
        } catch (error) {
            res.status(500);
            //console.log(error.message);
            throw new Error({message: error.message});
        }

        fileData = {
            fileName: req.file.originalname,
            filePath: uploadedFile.secure_url,
            fileType: req.file.mimetype,
            fileSize: fileSizeFormatter(req.file.size, 2),
        }
    }

    const updatedProduct = await Product.findByIdAndUpdate(
        {_id: id},
        {
            name,
            category,
            quantity,
            price,
            description,
            image: Object.keys(fileData).length !== 0 ? fileData : product.image,
        },
        {
            new: true,
            runValidators: true,
        }
        )

    res.status(200).json(updatedProduct);
});


module.exports = {
    createProduct,
    getProducts,
    getProduct,
    deleteProduct,
    updateProduct,
};