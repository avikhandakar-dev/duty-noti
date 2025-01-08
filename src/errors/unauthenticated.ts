import { StatusCodes } from "http-status-codes";
import CustomAPIError from "./custom-api";

class UnAuthenticatedError extends CustomAPIError {
  constructor(message:string) {
    super(message);
    (this as any).statusCode = StatusCodes.UNAUTHORIZED;
  }
}

export default UnAuthenticatedError;
