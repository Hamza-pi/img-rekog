import Image from "next/image";
import { Inter } from "next/font/google";
import AWS from "aws-sdk";
import { useState } from "react";
import { useRouter } from "next/router";

const inter = Inter({ subsets: ["latin"] });

export default function Home() {
  const [collection, setCollection] = useState("");
  const [loading,setLoading] = useState(false)

  const router = useRouter()

  const rekognition = new AWS.Rekognition({
    accessKeyId: process.env.NEXT_PUBLIC_ACESSKEY_ID,
    secretAccessKey: process.env.NEXT_PUBLIC_SECRETKEY,
    region: "us-east-1",
  });

  const createCollection= (e)=>{
    e.preventDefault();
    setLoading(true)
    const sanitizedCollection = collection.replace(/[^a-zA-Z0-9_.\-]+/g, '_');
    rekognition.createCollection({CollectionId:sanitizedCollection},(error,data)=>{
      if(error){
        console.log(error.message)
      }
      else{
        router.push("/gallery");
        console.log(JSON.stringify(data))
        localStorage.setItem("collection",JSON.stringify(sanitizedCollection))
      }
    })
    // rekognition.listCollections((err,data)=>{
    //   if(err){
    //     console.log(err.message)
    //   }
    //   else{
    //     console.log(data)
    //   }
    // })
    // rekognition.deleteCollection({CollectionId:"Wedding"},(error,data)=>{
    //   if(error){
    //     console.log(error.message)
    //   }
    //   else{
    //     console.log(data)
    //   }
    // })

  }

  return (
    <main
      className={`flex min-h-screen flex-col items-center justify-between p-24 ${inter.className}`}
    >
      <h1 className="text-3xl font-semibold mb-4">Image Filter App</h1>
      <form className="my-4 flex flex-col gap-y-[2rem]" onSubmit={createCollection}>
        <h1 className="text-2xl font-medium text-center">Create An Event</h1>
        <input
          className="px-[.5rem] py-[.7rem] rounded-lg outline-none border-none text-black"
          type="text"
          placeholder="Enter Name of Event.."
          onChange={(e) => setCollection(e.target.value)}
        />
        <button type="submit" className="p-3 bg-sky-500 text-white rounded-lg hover:bg-sky-400 font-semibold transition-all">
          {loading?"Creating...":"Create"}
        </button>
      </form>
    </main>
  );
}
