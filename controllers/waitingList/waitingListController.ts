// @ts-nocheck

import { waitListValidate } from "../../validations/waitListValidate";
import { supabase } from "../../config/supa";
import HandleResponse from "../../models/waitList/handleResponseWaitList";
import { Request, Response } from "express";

//Create Wait List
export const createWaitList = async (req: Request, resp: Response) => {
    const { error } = waitListValidate(req.body);
    if (error)
        return resp.status(400).send({ error: error?.details[0].message });
    await supabase
        .from("waitlist")
        .insert(HandleResponse.createWaitList(req.body))
        .then(response => {
            if (response.data === null) {
                resp.send({ message: "Successfully added to wait list." });
            } else {
                resp.status(400).send(response.error);
            }
        });
};
