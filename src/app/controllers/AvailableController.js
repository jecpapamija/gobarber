class AvailableController {
  async index(request, response) {
    const { date } = request.query;

    if( !date ) {
      return response.status(400).json({error: 'date is required'});
    }

    return response.json({ok: true});
  }
}

export default new AvailableController();
