import React, { useEffect, useState } from "react";
import Dropzone from "react-dropzone";
import AWS from "aws-sdk";
const Gallery = () => {
  const [collectionId, setCollectionId] = useState("");
  const [selfieImage, setSelfieImage] = useState(null);
  const [uploadedImages, setUploadedImages] = useState([]);
  const [filteredImages, setFilteredImages] = useState([]);
  const [loading, setLoading] = useState(false);

  const s3 = new AWS.S3({
    accessKeyId: process.env.NEXT_PUBLIC_ACESSKEY_ID,
    secretAccessKey: process.env.NEXT_PUBLIC_SECRETKEY,
    region: "us-east-1",
  });

  const rekognition = new AWS.Rekognition({
    accessKeyId: process.env.NEXT_PUBLIC_ACESSKEY_ID,
    secretAccessKey: process.env.NEXT_PUBLIC_SECRETKEY,
    region: "us-east-1",
  });

  const uploadSelfieToS3 = (file) => {
    const params = {
      Bucket: "imgrekog", // Replace with your S3 bucket name
      Key: `selfie/${file.name}`, // Customize the S3 key as needed
      Body: file,
    };

    s3.upload(params, (err, data) => {
      if (err) {
        console.error("Error uploading selfie to S3:", err);
      } else {
        console.log("Selfie uploaded to S3:", data.Location);
        setSelfieImage(data.Location); // Update the selfie image state with the S3 URL
      }
    });
  };

  const uploadImageToS3 = (file) => {
    const params = {
      Bucket: "imgrekog", // Replace with your S3 bucket name
      Key: `image/${file.name}`, // Customize the S3 key as needed
      Body: file,
    };

    s3.upload(params, (err, data) => {
      if (err) {
        console.error("Error uploading selfie to S3:", err);
      } else {
        console.log("Image uploaded to S3:", data.Location);
        setUploadedImages([...uploadedImages, data.Location]);
      }
    });
  };

  const handleSelfieUpload = (acceptedFiles) => {
    if (acceptedFiles.length > 0) {
      uploadSelfieToS3(acceptedFiles[0]);
    }
  };

  const handleImageUpload = (acceptedFiles) => {
    if (acceptedFiles.length > 0) {
      uploadImageToS3(acceptedFiles[0]);
    }
  };

  const indexFaces = async () => {
    if (selfieImage && uploadedImages.length > 0) {
      setLoading(true);

      // Step 1: Index faces in the uploaded images
      const faceRecords = [];
      for (const image of uploadedImages) {
        const imageName = image.split("/").pop();
        // Transform the externalImageId to match the pattern
        const externalImageId = `${imageName.replace(
          /[^a-zA-Z0-9_.\-:]/g,
          "_"
        )}`;
        const params = {
          CollectionId: collectionId,
          DetectionAttributes: ["ALL"], // Customize as needed
          ExternalImageId: externalImageId,
          Image: {
            S3Object: {
              Bucket: "imgrekog",
              Name: `image/${imageName}`,
            },
          },
        };

        try {
          const result = await rekognition.indexFaces(params).promise();
          if (result.FaceRecords && result.FaceRecords.length > 0) {
            faceRecords.push(result.FaceRecords[0]);
          }
        } catch (err) {
          console.error("Error indexing faces:", err.message);
        }
      }

      const imageName = selfieImage.split("/").pop();
      // Transform the externalImageId to match the pattern
      const externalImageId = `${imageName.replace(/[^a-zA-Z0-9_.\-:]/g, "_")}`;
      const params = {
        CollectionId: collectionId,
        DetectionAttributes: ["ALL"], // Customize as needed
        ExternalImageId: externalImageId,
        Image: {
          S3Object: {
            Bucket: "imgrekog",
            Name: `selfie/${imageName}`,
          },
        },
      };

      try {
        const result = await rekognition.indexFaces(params).promise();
        if (result.FaceRecords && result.FaceRecords.length > 0) {
          faceRecords.push(result.FaceRecords[0]);
        }
      } catch (err) {
        console.error("Error indexing faces:", err.message);
      }

      // Step 2: Search for the selfie image
      const searchParams = {
        CollectionId: collectionId,
        FaceMatchThreshold: 90,
        Image: {
          S3Object: {
            Bucket: "imgrekog",
            Name: `selfie/${selfieImage.split("/").pop()}`,
          },
        },
        MaxFaces: 20,
      };

      try {
        const searchResult = await rekognition
          .searchFacesByImage(searchParams)
          .promise();
        const matchingFaces = searchResult.FaceMatches.map(
          (match) => match.Face.ExternalImageId
        );
        const filteredImageUrls = [];
        for (const externalImageId of matchingFaces) {
          // Construct the S3 URL based on the externalImageId
          const imageUrl = `https://imgrekog.s3.amazonaws.com/image/${externalImageId.replace(
            /[^a-zA-Z0-9_.\-:]/g,
            "_"
          )}`;
          filteredImageUrls.push(imageUrl);
        }
        setFilteredImages(filteredImageUrls);
      } catch (err) {
        console.error("Error searching faces:", err.message);
      }

      setLoading(false);
    }
  };

  useEffect(() => {
    let id = JSON.parse(localStorage.getItem("collection"));
    setCollectionId(id);
  }, []);

  return (
    <div
      className={`flex min-h-screen flex-col items-center justify-between p-24`}
    >
      <h1 className="text-3xl font-semibold mb-4">Gallery</h1>
      <div className="mb-4">
        <h2 className="text-xl font-semibold mb-2">Upload a Selfie</h2>
        <Dropzone onDrop={handleSelfieUpload}>
          {({ getRootProps, getInputProps }) => (
            <div
              {...getRootProps()}
              className="dropzone border border-dashed border-gray-300 p-4"
            >
              <input {...getInputProps()} />
              {selfieImage ? (
                <img
                  src={selfieImage}
                  alt="Selfie"
                  className="max-w-full max-h-64"
                />
              ) : (
                <p>Drag 'n' drop your selfie here, or click to select files</p>
              )}
            </div>
          )}
        </Dropzone>
      </div>
      <div className="mb-4">
        <h2 className="text-xl font-semibold mb-2">Upload Images to Filter</h2>
        <Dropzone onDrop={handleImageUpload}>
          {({ getRootProps, getInputProps }) => (
            <div
              {...getRootProps()}
              className="dropzone border border-dashed border-gray-300 p-4"
            >
              <input {...getInputProps()} />
              <p>Drag 'n' drop your selfie here, or click to select files</p>
            </div>
          )}
        </Dropzone>
      </div>
      <div className="mb-4 w-[100%] flex items-start justify-center gap-x-5 overflow-x-scroll">
        {uploadedImages.length
          ? uploadedImages.map((img, i) => (
              <img
                key={i}
                src={img}
                alt="Selfie"
                className="max-w-[100px] max-h-[100px]"
              />
            ))
          : ""}
      </div>
      <div className="mb-4">
        <button
          onClick={indexFaces}
          className="bg-blue-500 text-white px-4 py-2 rounded"
          disabled={loading}
        >
          {loading ? "Indexing Faces..." : "Filter Images"}
        </button>
      </div>
      {filteredImages.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-2">Filtered Images</h2>
          <div className="filtered-images grid grid-cols-3 gap-4">
            {filteredImages.map((image, index) => (
              <img
                key={index}
                src={image}
                alt={`Filtered Image ${index}`}
                className="max-w-[200px] rounded-lg"
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Gallery;
