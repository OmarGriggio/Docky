import {Client} from "../types/client"
import { createClientInDB, deleteClientInDB, getClientByCode, getClientByEmail, getClientsFromDB } from "../repositories/client.repository";

export const getAllClientsServ = async () => {
  console.log("test111")
  return await getClientsFromDB();
};


export const addClientServ = async (clientData: Client) => {
  const clientCode = await getClientByCode(clientData.code_client);
  if (!clientCode) {
    if (clientData.email != ""){
      const clientMail = await getClientByEmail(clientData.email)
      if (!clientMail) {
        return await createClientInDB(clientData);
      } else {
        throw new Error("Client email already exists");
      }
    }
  } else {
    throw new Error("Client code already exists");
  }
}

export const deleteClientServ = async (clientData: Client) => {
  const client = await getClientByCode(clientData.code_client);
  if (client){
    return await deleteClientInDB(clientData.code_client) ;
  } else {
    throw new Error("Client not found");
  }

}