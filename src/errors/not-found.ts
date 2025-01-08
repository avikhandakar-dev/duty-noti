import { StatusCodes } from "http-status-codes";
import CustomAPIError from "./custom-api";

class NotFoundError extends CustomAPIError {
  constructor(message:string) {
    super(message);
    (this as any).statusCode = StatusCodes.NOT_FOUND;
  }
}

export default NotFoundError;
