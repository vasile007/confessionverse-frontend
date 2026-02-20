import api from "../api";

export const fetchChatRooms = async () => {
  const res = await api.get("/chatrooms");
  return res.data;
};

export const fetchMessages = async (chatRoomId) => {
  const res = await api.get(`/messages/chatroom/${chatRoomId}`);
  return res.data?.content ?? res.data;
};

export const sendMessage = (stompClient, chatRoomId, content, receiver=null) => {
  const user = JSON.parse(localStorage.getItem("user"));
  const dto = { content, sender: user.username, chatRoomId: chatRoomId.toString(), receiver };
  const destination = receiver ? "/app/chat.private" : "/app/chat.send";
  stompClient.publish({ destination, body: JSON.stringify(dto) });
};







