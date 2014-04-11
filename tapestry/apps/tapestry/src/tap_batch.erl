%%------------------------------------------------------------------------------
%%
%% Licensed under the Apache License, Version 2.0 (the "License");
%% you may not use this file except in compliance with the License.
%% You may obtain a copy of the License at
%%
%%     http://www.apache.org/licenses/LICENSE-2.0
%%
%% Unless required by applicable law or agreed to in writing, software
%% distributed under the License is distributed on an "AS IS" BASIS,
%% WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
%% See the License for the specific language governing permissions and
%% limitations under the License.
%%
%%-----------------------------------------------------------------------------
%%
%% @author Ryan Crum <ryan.j.crum@gmail.com>, Infoblox Inc <info@infoblox.com>
%% @copyright 2013 Infoblox Inc
%% @doc FTP service to connect Tapestry to the Infoblox Grid (6.9 or later).  The code is based on 
%% memory_server.erl example from Ryan Crum's bifrost Erlang based ftp server


-module(tap_batch).

-behavior(gen_server).

-export([start_link/0,
         load/1]).

-export([init/1,
         handle_call/3,
         handle_cast/2,
         handle_info/2,
         terminate/2,
         code_change/3]).

-define(STATE, tap_batch_state).
-record(?STATE, {
    }).

% -----------------------------------------------------------------------------
% API
% -----------------------------------------------------------------------------

start_link() ->
    gen_server:start_link({local, ?MODULE}, ?MODULE, [], []).

load(Data) ->
    gen_server:cast(?MODULE, {load, Data}).

% -----------------------------------------------------------------------------
% bifrost callbacks
% -----------------------------------------------------------------------------

init([]) ->
    {ok, #?STATE{}}.

handle_call(Msg, From, State) ->
    error({no_handle_call, ?MODULE}, [Msg, From, State]).

handle_cast({load, FtpData}, State) ->
    {BinaryData, Size} = decompress_file(FtpData),
    Data = parse_file(BinaryData, Size),
    error_logger:info_msg("Data = ~p~n",[Data]),
    tap_ds:ordered_edges(Data),
    {noreply, State};
handle_cast(Msg, State) ->
    error({no_handle_cast, ?MODULE}, [Msg, State]).

handle_info(Msg, State) ->
    error({no_handle_info, ?MODULE}, [Msg, State]).

terminate(_Reason, _State) ->
    ok.

code_change(_OldVersion, State, _Extra) ->
    {ok, State}.

% -----------------------------------------------------------------------------
% private functions
% -----------------------------------------------------------------------------

decompress_file(FileBytes)->
% XXX use file interface with ram and compressed options?
% XXX read file 53 bytes at a time?
% XXX identify alternate format?
    {ok, RF} = ram_file:open(FileBytes, [binary, ram, read]),
    {ok, Size} = ram_file:uncompress(RF),
    {ok, FullData} = ram_file:read(RF, Size),
    % XXX use compress option on tar?
    % XXX check file name?
    {ok, [{_, File}, _, _, _]} = erl_tar:extract({binary, FullData}, [memory]),
    {ok, RealFile} = ram_file:open(File, [binary, ram, read]),
    {ok, RealSize} = ram_file:get_size(RealFile),
    {RealFile, RealSize}.

parse_file(File,Size)->
    NumLines = Size div 53,  %% 53 Characters per line
    get_lines(File,NumLines,[]).

get_lines(_File, 0, Data)->
    lists:reverse(Data);
get_lines(File, LinesLeft, Data) ->
    {ok, BitString} = ram_file:read(File, 53),
    <<_Time:10/binary, _S:1/binary,
       ID1:20/binary, _S:1/binary,
       ID2:20/binary, _Rest/binary>> = BitString,
    V1 = bitstring_to_list(ID1),
    V2 = bitstring_to_list(ID2),
    Interaction = {V1, V2},
    get_lines(File, LinesLeft - 1, [Interaction | Data]).
