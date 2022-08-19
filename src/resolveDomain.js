
import { Resolution }  from '@unstoppabledomains/resolution'
const resolution = new Resolution()


export async function domainResolution(domain){
  try{
    return await resolution.addr(domain, 'ETH')
  }catch(err){
    console.log(err)
  }
}